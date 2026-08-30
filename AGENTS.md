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
**Arthur tem brapi Pro** — token em `.env.local` (`BRAPI_TOKEN`). Não presuma
que endpoints brapi retornam `[]` — antes de qualquer feature que precisa
de dado histórico premium (treasury history, quote intraday), fazer curl
direto com o token pra confirmar shape real. Nunca documentar
"requer Pro" sem antes testar com o token.
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
