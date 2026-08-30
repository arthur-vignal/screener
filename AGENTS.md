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
- **brapi.dev** como data provider primário (B3 + BCB)
- **Railway** pra deploy (auto-deploy em push na `main`)

## Layout do projeto

```
app/
  asset/[symbol]/
    page.tsx                          ← raiz do ticker (price hero + métricas)
    analysis/
      page.tsx + analysis-page-client.tsx  ← drilldown com 8 gráficos
  api/
    asset/[symbol]/
      route.ts                        ← bundle principal
      candles/                        ← histórico de preços
      stats-history/                  ← histórico de P/L
      income-quarterly/               ← DRE trimestral
      analysis/                       ← bundle consolidado + macro
    peer-benchmarks/[symbol]/         ← peers do subsetor + medianas
    macro/bcb/                        ← BCB SGS (SELIC, CDI, IBC-Br) — 10+ anos
  home/                               ← dashboard
  portfolio/, analysis/, news/        ← outras rotas
components/
  asset/                              ← componentes de /asset/[symbol]
  analysis/                           ← 9 componentes do drilldown
  foundation/                          ← DashboardDock, StaggerOnMount, Skeleton
lib/
  brapi.ts                            ← wrapper brapi v2
  cache.ts                            ← cached() wrapper
```

## Páginas e responsabilidades

- **`/asset/[symbol]`** — raiz do ticker. Header, preço, gráfico de preço
  (com tabs 1D/1W/1M/3M/YTD/1Y/5Y/All), EPS chart trimestral, P/E histórico
  com banda do subsetor, AnalystRatingsRadar (pentagonal), PriceTargetChart
  (candles + 3 linhas tracejadas convergindo — **mocks baseados em volatilidade**),
  QuarterResults (bar chart de revenue por QoQ).

- **`/asset/[symbol]/analysis`** — drilldown com 8 gráficos em 3 seções:
  1. Valuation contextualizada: PESelicScatter + EarningsYieldVsCDI
  2. Qualidade: MarginTrend (16Q stacked area) + ROICVsSelic + OwnershipDonut
  3. Earnings power vs macro: EPSVsRiskFree + RevenueVsPIB
  Botões "Full analysis" na raiz apontam pra cá.

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

### Seletor de cores
- Verde `var(--positive)` (#4dbe95) — ativo principal
- Azul #489ffa — macro de referência (SELIC, IBC-Br)
- Vermelho `var(--negative)` — outliers, problemas
- Roxo #7c5cff — insider ownership

### Brapi — pontos de atenção
- `/api/v2/stocks/{t}` retorna **404** pra tickers BR. **Usar `/api/quote/{t}`**
  com `modules=summaryProfile,defaultKeyStatistics,financialData`.
- `?modules=summaryProfile` no `/quote` funciona, mas outros módulos
  podem dar 403.
- Brapi limita `/v2/macro` a **500 obs** sem filtros (selic/cdi).
  Pra histórico longo (>10 anos), **usar BCB SGS** em `/api/macro/bcb`.
- brapi `incomeStatementHistoryQuarterly` retorna `basicEarningsPerShare`
  null mas popula `basicEarningsPerCommonShare` em centavos. **Normalizar
  dividindo por 100**. Ver `/api/asset/[symbol]/income-quarterly/route.ts`.

### P/E histórico
Janela de **4 anos** + remove outliers (P/L > 100 ou negativo). Banda
P25-P75 do subsetor + mediana destacada em azul.

### Peer benchmarks
Endpoint `/api/peer-benchmarks/[symbol]` refatorado em
`b215821..51a1d07` pra usar `/quote/{t}?modules=summaryProfile` (filtre
por sectorDisp) + batch `/stocks/statistics?symbols=X,Y` (max 19 por
request, limite do plano Pro). Retorna `peerCount` e `medians`.

## Macros (BCB SGS)

Endpoint `/api/macro/bcb?series=selic,cdi,ibcbr` — grátis, sem auth.

| slug | sgs code | freq   | unidade |
|------|----------|--------|---------|
| selic | 432     | daily  | % a.a.  |
| cdi   | 4389    | daily  | % a.a.  |
| ibcbr | 24363   | monthly| índice  |

⚠️ **CDI (4389) já vem anualizado em % a.a.** Não multiplicar por 365.
SELIC (432) também já é % a.a. direto.

Limitações:
- Séries diárias: janela máxima de 10 anos (BCB rejeita > 10 anos)
- Séries mensais: sem limite aparente

Cache: 24h. Séries macro mudam raramente.

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

## Commits recentes importantes

- `64318cb` — fix CDI anualizado (era 4982%, agora ~13.9%)
- `51a1d07` — macro via BCB SGS (10 anos de histórico)
- `e261b1e` — 2ª linha (SELIC/IBC-Br) SÓLIDA (não tracejada)
- `eeaf838` — SELIC tracejada mais visível (revertido depois)
- `b215821` — macro endpoint retorna 500 obs
- `278ab0a` — EPSVsRiskFree usa earnings yield em %
- `94c7470` — drilldown /analysis com 8 gráficos (FEATURE PRINCIPAL)
- `3ba69ce` — redesign analyst/price target/earnings + sector median
- `120a4a8` — bundle /quote/{t} + P/L com banda do subsetor

## Bugs conhecidos / limitações

1. **Price target é mock** — brapi não tem sell-side target pra BR
   (targetHigh/Low/Median/Mean todos null). Mock em `PriceTargetChart.deriveMockTargets()`:
   high = current × 1.2, median = current + (high-low) × 0.3, low = current × 0.85.
   Documentado no footer da página.

2. **Insider/Institutional ownership** — brapi tem `heldPercentInsiders`
   e `heldPercentInstitutions` mas valores podem estar null pra alguns
   ativos. OwnershipDonut mostra "100% Float" nesse caso.

3. **Earnings yield implícito** — `EPSVsRiskFree` usa preço atual pra
   calcular yield em quarters passados. Se preço era diferente, é
   aproximado. Pra precisão, brapi não tem histórico de preço gratuito.

4. **Stats history filtrada** — `PEHistoryChart` usa últimos 4 anos com
   trailingPE > 0 e < 100. Lava Jato/COVID tinham P/L outlier.

## Skills importantes disponíveis

- `brapi-doc-scanner` — SEMPRE escanear `https://brapi.dev/docs` antes de
  feature nova. Workflow: sitemap → endpoint candidate → catalogar.
- `sulfur-ui-rules`, `sulfur-chart-theme`, `sulfur-design-hardening` —
  regras de design transversais.
- `arthur-visual-style` — convenções de UI do Arthur pro Sulfur.
- `user-arthur-collaboration` — regras de Arthur (PT-BR casual, etc).

## Pendente / próximos passos

Da fase 3 do plan original (`/asset/[symbol]` raiz):
- Grid de PreviewWidget (4 colunas com 1 por grupo) — não implementado
  (temos MetricStrip linear em vez disso)
- Tabela de métricas estilo AGRO3 — não implementado

Da fase 4 (drilldowns ricos):
- 9 rotas (`/valuation`, `/profitability`, `/risk`, `/dividends`,
  `/cashflow`, `/return`, `/value`, `/seasonality`, `/score`) — todas
  pendentes. Arthur decidiu seguir com `/analysis` consolidado em vez
  de 9 páginas separadas.

Da fase 5 (`/analysis` macro BR):
- Página `/analysis` (top-level) com Economics/Markets tabs
- Endpoints BCB pra NTN-B, risco país (CDS), câmbio, IBC-Br

## Modo de comunicação com Arthur

- PT-BR casual (sem "Claro!", "Ótima pergunta!")
- Direto, sem enrolação
- Mostra prints, valida visualmente
- Resposta curta quando pergunta é curta
- Deixa ele escolher entre opções com `clarify`
- Antes de implementar feature grande com brapi, **sempre criar endpoint
  de debug primeiro** pra ver shape real (regra Arthur).
