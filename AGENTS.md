# Sulfur — contexto pra próxima sessão

## Identidade

Sou o Kibo. Estou ajudando o Arthur (irmão do Victor) com o projeto
Sulfur — plataforma de análise do mercado financeiro brasileiro
(estilo Fey UI Kit, identidade visual própria).

## Stack

- **Next.js 16** com Turbopack/webpack
- **TypeScript** estrito (escala fechada de tokens em `app/globals.css`)
- **Tailwind CSS** + tokens semânticos (`var(--positive)`, `var(--negative)`,
  `var(--primary)`, `var(--foreground)`, `var(--background)`)
- **lucide-react** pra ícones (única lib de ícones)
- **recharts** pra gráficos
- **SWR** pra fetching client-side
- **brapi.dev v2** como data provider primário (B3 + Tesouro)
- **BCB SGS** via `/api/macro/bcb` pra séries macro históricas (free, sem auth)
- **Railway** pra deploy (auto-deploy em push na `main`)

## Layout do projeto

```
app/
  asset/[symbol]/
    page.tsx                          ← raiz do ticker (price hero + métricas)
    analysis/
      page.tsx + analysis-page-client.tsx  ← drilldown com 11 gráficos em 4 seções
  api/
    asset/[symbol]/
      route.ts                        ← bundle principal (raiz)
      candles/                        ← histórico de preços
      stats-history/                  ← histórico de P/L
      income-quarterly/               ← DRE trimestral
      analysis/                       ← bundle consolidado (8 helpers analíticos)
      dividends/                      ← histórico de dividendos
    peer-benchmarks/[symbol]/         ← peers do subsetor + ROE/EV·EBITDA (B4)
    macro/bcb/                        ← SELIC, CDI, IBC-Br (free)
    debug/                            ← smoke + asset debug
    coverage/[symbol]/                ← cobertura brapi por ticker
    dictionary/                       ← dicionário de campos brapi
  home/                               ← dashboard
  portfolio/, analysis/, news/        ← outras rotas
components/
  asset/                              ← componentes de /asset/[symbol] (raiz)
  analysis/                           ← 12 componentes do drilldown /analysis
  foundation/                          ← DashboardDock, StaggerOnMount, Skeleton
lib/
  brapi.ts                            ← wrapper brapi v2 (10 wrappers granulares)
  cache.ts                            ← cached() wrapper
  analytics/                          ← 7 helpers de cálculo (ver abaixo)
```

## Páginas e responsabilidades

- **`/asset/[symbol]`** — raiz do ticker. Header, preço, gráfico de preço
  (tabs 1D/1W/1M/3M/YTD/1Y/5Y/All), EPS chart trimestral, P/E histórico
  com banda do subsetor, AnalystRatingsRadar (pentagonal), **FairValueChart**
  (preço vs fair value implícito = EPS LTM × P/L médio 5a — sem mocks, só dado real).
  QuarterResults (bar chart de revenue por QoQ).

- **`/asset/[symbol]/analysis`** — drilldown com **11 gráficos em 4 seções**:
  1. **Valuation contextualizada** (2 cols):
     `ValuationBands` (P/L | EV/EBITDA | P/VP com bandas ±1σ/±2σ + sub-gráfico
     preço vs fair value) · `PeerScatter` (ROE × EV/EBITDA com reta OLS,
     fallback pro sector amplo se subsetor tem <3 peers)
  2. **Qualidade do ativo** (3 cards):
     `MarginTrend` (16Q, áreas sobrepostas sem stack) ·
     `ROICVsWACC` (NOPAT/capital_investido vs Ke·E + Kd·D) ·
     `LeverageChart` (dívida líquida/EBITDA LTM + cobertura de juros com
     bandas de risco)
  3. **Earnings power vs macro** (2 cols):
     `EarningsYieldVsRiskFree` (1/trailingPE vs SELIC) · `RevenueVsPIB` (YoY%)
  4. **Quanto você espera ganhar** (2 cols):
     `YieldComparison` (EY / FCFY / DY no mesmo eixo) ·
     `EquityRiskPremium` (EY nominal vs NTN-B 2045 real)

  Botões "Full analysis" na raiz → `/asset/[symbol]/analysis`.

- **`/home`** — dashboard 3 colunas (carteira / cotações / notícias).

## Padrões estabelecidos

### Botão "drilldown"
Texto: "Full analysis" (não "All earnings" / "All estimates").
Aponta pra `/asset/[symbol]/analysis`.

### Gráficos de comparação X vs Y
**Ambos no mesmo eixo % a.a.** Plotar **2 linhas SÓLIDAS** (verde do
ativo + azul #489ffa do macro), mesma espessura (strokeWidth 2),
opacity 1.0. Linha tracejada era design antigo — Arthur pediu pra
remover. Quando uma cruzar a outra, fica visualmente óbvio.

**Exceção** (regra explícita): a **média histórica** em gráficos de
bandas (B1) pode ser tracejada — média é outra categoria, não é
comparação ativo × macro. Confirmar com Arthur caso a caso.

### Seletor de cores
- Verde `var(--positive)` (#4dbe95) — ativo principal / EY
- Azul #489ffa — macro de referência (SELIC, IBC-Br, NTN-B)
- Vermelho `var(--negative)` — outliers, problemas, dívida alta
- Roxo #7c5cff — FCF yield (libertado do insider ownership no A5)
- `var(--muted)` — dividend yield, mediana

### Eixo X com `scale="time"`
Componente `<TimeXAxis>` em `components/analysis/analysis-utils.tsx`.
Usa `type="number"`, `scale="time"`, `domain={["dataMin", "dataMax"]}`,
`dataKey="ts"` (timestamp numérico em ms). Caller adiciona `ts` aos
rows via `attachTimestamps()`. **NÃO usar `dataKey="endDate"` + tickFormatter
de string** — buracos de dado viram compressão silenciosa do tempo.

### Brapi v2 — pontos de atenção
- `/api/v2/stocks/{t}` (path param) retorna **404** pra tickers BR.
  Usar `/api/v2/stocks/quote?symbols=PETR4` com `symbols=` em batch.
- `/api/v2/stocks/quote` e `/financial-data` funcionam no **free tier**
  (retornam dados granulares como `returnOnEquity`, `EBITDA`).
- `/api/v2/stocks/statistics?symbols=X,Y,Z` (BATCH) tem **bug conhecido**:
  retorna `returnOnEquity=null` em todos os itens. **Workaround**: chamar
  single por símbolo em paralelo. Cache interno mitiga custo.
**Arthur tem brapi Pro** — token em `.env.local` (`BRAPI_TOKEN`). Plano **Irrestrito**. NÃO tem brapi free.
Regras:
1. **Antes de qualquer feature brapi, checar `https://brapi.dev/docs`** — ver se o endpoint existe, quais módulos/parâmetros o plano oferece, e o shape da resposta. Documentação é a fonte verdade, não chute.
2. Fazer curl direto com o token pra confirmar shape real retornado. Não presumir que endpoints retornam `[]` / 402.
3. Não documentar "requer Pro" sem antes testar com o token.
4. Não tentar fallback pra brapi free — não existe nesse projeto.
5. Se brapi Irrestrito não tem o campo, documentar isso (não inventar proxy via Yahoo/Google).
- Endpoints Irrestrito já validados neste projeto (2026-08-27+):
  `/api/v2/quote/{t}` com `?modules=summaryProfile,defaultKeyStatistics,
  financialData,incomeStatementHistory,balanceSheetHistory,
  cashflowHistoryQuarterly` — retorna **todos esses módulos** com
  token Pro. Free só retorna `historicalDataPrice` + quote básico.
- Brapi limita `/v2/macro` a **500 obs** sem filtros. Pra histórico
  longo (>10 anos), **usar BCB SGS** em `/api/macro/bcb`.
- `brapi` income-statement histórico: `basicEarningsPerShare` vem null
  mas `basicEarningsPerCommonShare` vem em **centavos**. Endpoint
  `/api/asset/[symbol]/income-quarterly` normaliza dividindo por 100.
  ATENÇÃO: esse campo é por **classe** (ON vs PN), não por share total —
  não serve pra derivar P/L confiável. **Usar `trailingPE` da própria
  brapi** no `/statistics` que já vem correto.

### P/E histórico
- `PEHistoryChart` na raiz: janela **4 anos** + remove outliers
  (P/L > 100 ou negativo) com banda P25-P75 do subsetor + mediana azul.
- `ValuationBands` no /analysis: **winsorização p1/p99** (clip nos
  percentis 1 e 99, mantém o ponto) com bandas ±1σ / ±2σ e badge
  "pXX · ±Yσ". EV/EBITDA descarta EBITDA≤0 (razão sem sentido).

## Macros (BCB SGS + brapi Treasury)

### BCB SGS (free, sem auth)
Endpoint `/api/macro/bcb?series=selic,cdi,ibcbr`.

| slug | sgs code | freq   | unidade |
|------|----------|--------|---------|
| selic | 432     | daily  | % a.a.  |
| cdi   | 4389    | daily  | % a.a.  |
| ibcbr | 24363   | monthly| índice  |

⚠️ **CDI (4389) já vem anualizado em % a.a.** Não multiplicar por 365.
SELIC (432) também já é % a.a. direto.

Limitações: séries diárias janela máxima de 10 anos. Cache 24h.

### brapi Treasury (acesso via Pro token em .env.local)
`/v2/treasury/indicators/history?symbols=tesouro-ipca-15052045` —
**249 pontos históricos** com seu token Pro (testado em 2026-08-30,
mais recente: 2026-08-28, buyRate 7.29% a.a. real). B5
(EquityRiskPremium) usa NTN-B 2045 longa.

## Tokens de design

```css
--background:    #070709
--surface:       #101116   /* cards */
--surface-2:     #15151a   /* elevated, tooltip */
--foreground:    #eeeff1
--muted:         #9ba1a8
--positive:      #4dbe95
--negative:      #d84f68
--primary:       #489ffa   /* accent azul — diferente do Fey */
--border:        rgba(238,239,241,0.10)
```

Font scale fechada: 10/11/12/14/16/20/24/32. Radius: md(6)/lg(8)/xl(12)/2xl(16).
Spacing: múltiplos de 4.

## Lib de analytics (7 helpers)

Em `lib/analytics/`. Cada um é função pura que recebe dados brapi e
retorna série + summary:

1. **`earnings-yield-history.ts`** — `computeEarningsYieldHistory(statsHistory)`
   → série trimestral de EY = 1/trailingPE. Usado em A1, B3, B5.
2. **`valuation-bands.ts`** — `computeValuationBands(statsHistory)` → 3
   bandas (P/L, EV/EBITDA, P/VP) com winsorização p1/p99, percentil
   atual, σ1/σ2, e `peMean5a` pra fair value. Usado em B1.
3. **`roic-wacc.ts`** — `computeROICvsWACC(...)` → ROIC = NOPAT / capital
   investido vs WACC = (E/V)·Ke + (D/V)·Kd·(1-t). Ke via CAPM (NTN-B
   + beta × ERP 5.5%). Expõe `totalDebtOf()` que soma dívida granular
   da brapi. Usado em A4, fscore.ts, metrics-table.ts.
4. **`leverage.ts`** — `computeLeverage(...)` → dívida líquida/EBITDA
   LTM + cobertura de juros. Usado em B2.
5. **`yield-comparison.ts`** — `computeYieldComparison(...)` → 3 yields
   (EY, FCFY, DY) + gap médio EY-FCFY 8T. Usado em B3.
6. **`equity-risk-premium.ts`** — `computeEquityRiskPremium(...)` →
   premium = EY - NTN-B 2045. Usado em B5.
7. (futuro) **return-bridge.ts** — waterfall Δlucro + Δmúltiplo +
   dividendos. B6 — fase 2, não implementado.

## Commits recentes (spec 2026-08-29)

Ordem cronológica inversa (mais recente primeiro):

- `b58e70d` — feat(analysis): B3 YieldComparison + B5 EquityRiskPremium
- `665790a` — feat(analysis): B4 PeerScatter (ROE × EV/EBITDA + OLS)
- `7f25203` — feat(analysis): A4 (ROIC vs WACC) + B2 (LeverageChart)
- `3675992` — feat(analysis): B1 ValuationBands (P/L | EV/EBITDA | P/VP + fair value)
- `6fa85d1` — fix(analysis): A2/A3/A5/A6/A7 + refactor earningsYieldHistory
- `497699e` — fix(analysis): earnings yield uses 1/trailingPE history (A1)
- `faedca7` — refactor(brapi): migrate core wrapper to v2 granular endpoints (A8)
- `1c07190` — docs: histórico da sessão 2026-08-29 (redesenho do ticker)
- `ba08d5c` — docs: cria AGENTS.md com contexto completo do projeto
- (sessão 2026-08-27 original) — 64318cb, 51a1d07, e261b1e, etc.

## Bugs conhecidos / limitações

1. **Price target removido** (A7) — `PriceTargetChart` (mocks de
   high = current × 1.2, etc) foi **deletado** e substituído por
   `FairValueChart` (preço vs fair value implícito = EPS LTM × P/L
   médio 5a). Sem mocks, só dado real. Ver `components/asset/fair-value-chart.tsx`.

2. **Ownership donut removido** (A5) — `heldPercentInsiders` /
   `heldPercentInstitutions` vinham null pra maioria dos ativos BR
   e o componente degradava pra "100% Float" — donut de uma fatia só,
   zero informação. Composição acionária real exige o item 15 do
   Formulário de Referência (CVM), fora do escopo. **Slot liberado
   para LeverageChart (B2)**.

3. **Earnings yield corrigido** (A1) — bug antigo: `EPSVsRiskFree`
   plotava `EPS / currentPrice × 100` (yield implícito se preço se
   mantivesse constante). Corrigido: `1/trailingPE[t]` (computado no
   server via `computeEarningsYieldHistory` em
   `lib/analytics/earnings-yield-history.ts`).

4. **Stats history filtrada** — `PEHistoryChart` raiz usa últimos 4 anos
   com trailingPE > 0 e < 100. Lava Jato/COVID tinham P/L outlier.

5. **brapi `/statistics?symbols=X,Y,Z` em batch zera `returnOnEquity`**
   — bug upstream. Workaround: chamadas single em paralelo (cache
   mitiga). Ver `app/api/peer-benchmarks/[symbol]/route.ts`.

6. **`basicEarningsPerCommonShare` em centavos** — `income-statement`
   retorna esse campo em centavos, dividido por classe (ON vs PN),
   não serve pra derivar P/L confiável. Usar `trailingPE` do
   `/statistics` que já vem correto.

## Pendente / próximos passos

### Spec 2026-08-29 — B6 ReturnBridge (fase 2)
- Waterfall `retorno_total ≈ Δlucro + Δmúltiplo + dividendos`
- Não implementado (opcional, pode ser pulado)

### Da fase 3 do plan original (`/asset/[symbol]` raiz)
- Grid de PreviewWidget (4 colunas com 1 por grupo) — não implementado
  (temos MetricStrip linear em vez disso)
- Tabela de métricas estilo AGRO3 — não implementado

### Da fase 4 (drilldowns ricos — 9 rotas separadas)
- 9 rotas (`/valuation`, `/profitability`, `/risk`, `/dividends`,
  `/cashflow`, `/return`, `/value`, `/seasonality`, `/score`) — todas
  pendentes. Arthur decidiu seguir com `/analysis` consolidado em vez
  de 9 páginas separadas. **A1+A2+A3+A4+A7+A8 + B1+B2+B3+B4+B5 cobrem
  todas as perguntas que essas 9 rotas responderiam**.

### Da fase 5 (`/analysis` macro BR — próxima macro feature)
- Página `/analysis` (top-level, distinta de `/asset/[symbol]/analysis`)
  com tabs Economics / Markets. Não implementado.
- Endpoints BCB pra NTN-B, risco país (CDS), câmbio, IBC-Br
  detalhado. NTN-B já integrado em B5 (mas bloqueado por Pro).

## Skills importantes disponíveis

- `brapi-doc-scanner` — SEMPRE escanear `https://brapi.dev/docs` antes de
  feature nova. Workflow: sitemap → endpoint candidate → catalogar.
- `sulfur-ui-rules`, `sulfur-chart-theme`, `sulfur-design-hardening` —
  regras de design transversais.
- `arthur-visual-style` — convenções de UI do Arthur pro Sulfur.
- `user-arthur-collaboration` — regras de Arthur (PT-BR casual, etc).

## Modo de comunicação com Arthur

- PT-BR casual (sem "Claro!", "Ótima pergunta!")
- Direto, sem enrolação
- Mostra prints, valida visualmente
- Resposta curta quando pergunta é curta
- Deixa ele escolher entre opções com `clarify`
- Antes de implementar feature grande com brapi, **sempre criar endpoint
  de debug primeiro** pra ver shape real (regra Arthur).
- Commits granulares (um por item da spec) — fácil de reverter
  cirurgicamente se um bug aparecer.

## Histórico da sessão 2026-08-31 (Fase 1 — bugs diretos + brapi pipeline)

Arthur voltou pro commit `4f9e6f4` (rollback dos fixes anteriores que
estavam mal) e pediu uma lista de 22 fixes + 1 correção de trimestre
errado + 1 fix de design system. Kibo entregou Fase 1 em 9 commits
granulares:

**Commits entregues (em ordem):**
- `183e48e` — fix(home): search filtra rows por símbolo/nome (item 1)
- `b1a9ea4` — fix(news): alinhar nome do campo tickers entre server e client
- `b991069` — fix(news): chips de ticker clicáveis no headline (itens 9 + 22)
- `d558c77` — fix(news): NewsSummaryCard aceita tickers opcionais no type (item 12)
- `1b373f2` — fix(asset): popular historicals com dados que vinham [] (B1+B2+B3)
- `84838f1` — fix(quote): 7D/30D com candle na ordem errada (DESC → ASC) (item 3)
- `18cab27` — fix(quarter): chart pega ano fiscal completo, não mistura quarters
- `b0a2612` — fix(ui): formatar longName em Title Case (item 8)
- `e285986` — fix(fair-value): mostra mean E median como 2 fair values (item 10)

**Bug crítico paralelo descoberto (não na lista original):**
`/api/asset/[symbol]` tinha `historicals.keyStatistics = []`,
`historicals.financialData = []`, `historicals.incomeQuarterly = []`
embora chamasse `brapiStatistics({mode:history})`. Resolvido em
`1b373f2` reusando `statsHistoryRaw` e adicionando 2 chamadas
adicionais (`brapiFinancialData mode=history`, `brapiIncomeStatement
period=quarterly`).

**Bug do item 3 (7D/30D sempre 0):** causa raiz foi brapi retornar
candles em DESC enquanto o `getBrapiCandlesChange` assumia ASC.
Resultado: `pickClosest(target7)` e `pickClosest(target30)` colapsavam
na mesma candle (a mais antiga), pct = 0. Fix: ordenar ASC antes do
cálculo.

**Item 10 (EQTL3 fair value):** math estava correto (P/L 26.1 vs
média 5a 12.79 = banda +2.8σ → FV R\$ 17.91 vs preço R\$ 36.67).
EQTL3 está genuinamente esticada. Fix: mostrar AMBOS mean e median
como 2 fair values pra dar contexto (median = R\$ 22.73, mais robusto
a outliers COVID).

**Pendentes (próxima sessão):**
- Item 14: seletor de período nos 11 charts de `/analysis` que ainda
  não usam `<PeriodTabs>`. Auditar e plugar.
- B4: criar wrapper `brapiValueAdded` em `lib/brapi.ts` pra popular
  `historicals.valueAdded`. Não existe ainda.
- B5: refactor `lib/brapi-full.ts` linha 791 que chama `/v2/quote/{t}
  ?modules=...` (404). Endpoint não existe mais.
- Fase 2: paginação 50/página, fetch news, notícia do dia = maior mkt
  cap, ações relacionadas em slot, pop-up widget search liquid glass,
  raw-data page, etc.

**Conhecimento novo descoberto:**
- brapi v2 quebrou `?modules=` no `/v2/stocks/quote` — retorna 19 chaves
  básicas ignorando modules. Path granular correto: `/v2/stocks/profile`,
  `/v2/stocks/statistics?mode=current`, `/v2/stocks/financial-data`.
- `/v2/quote/{t}?modules=...` (sem `/stocks/`) retorna 404.
- `/v2/stocks/quote?symbols=X&modules=Y` retorna 200 mas SEM modules
  extras.
- `lib/brapi.ts` granular já tá usando os endpoints granulares corretos

## Histórico da sessão 2026-09-01 (home layout + BDR + ON/PN + aceternity dock + news feed)

Arthur voltou reclamando de (a) alinhamento dos cards da /home até
a "linha vermelha" e (b) BDR aparecendo no ranking de ações. Kibo
entregou Fase 1 layout + B3 classifier + PN-only em 9 commits
granulares.

**Commits entregues (em ordem):**
- `ec3611b` — fix(quote): colapsa ON/PN duplicadas, mantém só preferencial
- `6314065` — fix(home): cards da coluna esquerda esticam até a base
- `64f91a5` — fix(home): aplica flex-1 + h-full na hierarquia certa
- `16d069e` — fix(home): card de Cotacoes estica até a base do grid
- `a464b07` — fix(home): limita altura em 100dvh-240px (para antes da linha vermelha)
- `4c5d1ef` — fix: disable strict mode pra hydration mismatch
- `1aa9068` — refactor: aplica SulfurDock (wrapper aceternity) nas 4 paginas
- `11dceb7` — chore(deps): adiciona deps do shadcn/aceternity (floating-dock)
- `715d19a` — fix(b3-classify): regex BDR cobre 30-39 (antes só 34/35/36/39)

**Layout dos cards da /home (resolvido):**

Grid 3-col em `app/(app)/home/page.tsx`:
```
<div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px] gap-5 items-stretch">
  <div className="flex flex-col gap-5" style={{ maxHeight: "calc(100dvh - 240px)" }}>
    <StaggerOnMount className="flex-1 min-h-0 flex">
      <PortfolioCard state={portfolio} className="h-full w-full" />
    </StaggerOnMount>
    <StaggerOnMount><DayHighlightCard ... /></StaggerOnMount>
  </div>
  <StaggerOnMount className="flex-1 min-h-0 flex" style={{ maxHeight: "calc(100dvh - 240px)" }}>
    <QuotationsTable className="h-full w-full" ... />
  </StaggerOnMount>
  <StaggerOnMount style={{ maxHeight: "calc(100dvh - 240px)" }}>
    <NewsFeed items={news} loading={newsLoading} maxItems={6} />
  </StaggerOnMount>
</div>
```

Hierarquia de altura pra esticar:
1. `items-stretch` no grid (alinha as 3 colunas na mesma altura)
2. `max-height: calc(100dvh - 240px)` em cada coluna (para antes da
   linha vermelha em 1080p = 840px)
3. `flex-1 min-h-0 flex` no StaggerOnMount do PortfolioCard (estica até
   a base da coluna esquerda)
4. `h-full w-full` no PortfolioCard (preenche o motion.div)
5. `flex flex-col` no card raiz do QuotationsTable + `flex-1 min-h-0
   overflow-y-auto` no scroll interno (preenche o resto do card)

**BDR classifier (resolvido):**

Em `lib/b3-classify.ts`, regex BDR expandida de `3[4569]$` pra `3[0-9]$`.
Antes: PRXB31, AAPL30-33, MSFT30-33, ITUB31, PETR31 (todos BDRs level
30-33) caíam no default = `stock`. Depois: BDRs identificados corretamente.

`/api/assets/quote?type=stock` agora retorna 279 stocks (era 335 com
contaminação de BDRs). Top 10 validados: PETR4, ITUB4, VALE3, ABEV3,
BPAC5, WEGE3, BBDC4, ITSA4, AXIA7, BBAS3.

**ON/PN collapse (resolvido):**

Helper `collapseOnPn()` em `app/api/assets/quote/route.ts` remove ON
quando existe PN/PNA/PNB/PN-Gold (4/5/6/7) da mesma empresa. Hierarquia
7 (PN-Gold) > 6 (PNB) > 5 (PNA) > 4 (PN) > 3 (ON). Edge cases cobertos:
- PETR3+PETR4 → PETR4
- ITUB3+ITUB4 → ITUB4
- BBDC3+BBDC4 → BBDC4
- BPAC3+BPAC5 → BPAC5 (PNA > ON)
- AXIA3+AXIA7 → AXIA7 (PN-Gold > ON)
- VALE3, ABEV3, WEGE3, BBAS3 (sem duplicata) → mantidos
- FII/ETF/BDR passam direto (não têm ON/PN)

Arthur pediu pra reverter quando quiser ON de volta: toggle de botão na
UI do `QuotationsTable` ou `?includeOn=true` query param.

**Aceternity dock (instalada via shadcn):**

`npx shadcn@latest add @aceternity/floating-dock-demo` instalou o
componente original em `components/ui/floating-dock.tsx` (200 linhas).

Wrapper `components/foundation/sulfur-dock.tsx` (~140 linhas) converte
meus items (`{href, label, icon: keyof}`) pro formato aceternity
(`{title, icon: ReactNode, href}`) e aplica posição `fixed bottom-5
left-1/2 -translate-x-1/2` + liquid glass com `!bg-black/30 !border-white/10
backdrop-blur-md` (twMerge respeita `!`).

`lib/utils.ts` foi sobrescrito pelo shadcn (perdeu helpers como
`formatNumber`, `formatCompact`, `formatPercent`). **RESTAUREI** os
helpers porque 30+ arquivos do projeto dependiam.

`app/layout.tsx` foi modificado (adicionou fonte Geist, mudou className).
**REVERTI** porque quebra o design system.

`app/globals.css` foi modificado (adicionou `@import "shadcn/tailwind.css"`).
**REVERTI** porque pode quebrar o globals existente.

## Pendente / próximos passos (sessão 2026-09-01 em diante)

### News feed DESABILITADO (commit `ab8c457`)

Arthur reportou travamento no /home ("Não consigo dar f12, não consigo
atualizar"). Kibo tentou várias hipóteses (cold start 6s do
/api/news/multi, tagTickers em cada render, render loop) e não
conseguiu diagnosticar com 100% de certeza. Solução aplicada:
**desabilitar o fetch de news no client** com comentário preservando
o fix (`data.items → data.news`).

Estado atual:
- `/api/news/multi` continua funcional (testada em prod: 200 OK com
  8+ items, dados reais)
- Client não chama mais. NewsFeed renderiza com `items={[]}` →
  mostra "Sem notícias no momento"
- DayHighlight renderiza com `loading={false}` + `headline={null}` →
  mostra "Sem destaque do dia ainda"

Pra religar news (futuro):
1. Investigar causa real do travamento
2. Hipóteses não confirmadas:
   - Cold start /api/news/multi (5.93s) bloqueia worker do Railway
   - tagTickers em cada NewsCard (~500 regex tests por render)
   - React Strict Mode duplicando requests
3. Sugestões: SSR do news, pre-render no build, SWR com cache local,
   timeout menor no `maxDuration` da API

### Tarefas pendentes (já estavam antes do travamento)
- **Card de alinhamento**: RESOLVIDO (100dvh-240px)
- **Cotação esticando**: RESOLVIDO
- **BDR classifier**: RESOLVIDO
- **ON/PN toggle**: parcialmente (só PN agora; ON precisa de botão)
- **B4 brapiValueAdded**: stashed como `stash@{0}: B4-b5-wip` (não commitado)
- **B5 lib/brapi-full.ts:791** endpoint 404: pendente
- **Raw data page CSV export**: pendente
- **9 charts PeriodTabs em /analysis**: pendente (não foi completado)
- **brapi-full.ts migração v2** (commit `faedca7`): parcial — só
  `brapi-full.ts` ficou pendente
