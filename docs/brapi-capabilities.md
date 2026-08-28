# Brapi — Capacidades disponíveis

Catálogo de endpoints brapi.dev e como o Sulfur usa. Última atualização: 2026-08-27.

**Regra:** antes de implementar feature nova que precisa de dado, escanear este catálogo + sitemap em https://brapi.dev/sitemap.xml.

## Endpoints principais usados pelo Sulfur

### `/api/v2/quote/{ticker}` — Cotação live
- **Usa pra:** preço, volume, mudança diária, market cap
- **Modules:** `summaryProfile` (perfil), `defaultKeyStatistics` (KPIs)
- **Campos úteis:** `regularMarketPrice`, `regularMarketChangePercent`, `regularMarketVolume`, `marketCap`, `fiftyTwoWeekHigh`, `fiftyTwoWeekLow`, `priceEarnings`
- **Limit:** gratuito tem rate limit; plano Pro libera

### `/api/v2/quote/{ticker}?range=...&interval=...` — Candles
- **Ranges:** 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max
- **Intervals:** 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
- **Usa pra:** gráfico de preço no /asset/[symbol]
- **Wrapper Sulfur:** `/api/asset/[symbol]/candles?days=...`

### `/api/v2/stocks/statistics?symbols=A,B&mode=current|history&period=annual|quarterly` ⭐
- **Usa pra:** P/L, P/VP, beta, dividend yield, price target, EPS
- **`mode=current`:** snapshot atual (TTM)
- **`mode=history&period=quarterly`:** série trimestral (12-16 quarters)
- **`mode=history&period=annual`:** série anual (4-5 anos)
- **Campos:** `trailingPE`, `forwardPE`, `trailingEps`, `forwardEps`, `priceEarnings`, `priceToBook`, `beta`, `bookValue`, `priceSales`, `earningsGrowth`, `revenueGrowth`, `earningsQuarterlyGrowth`, `grossMargins`, `profitMargins`, `operatingMargins`, `ebitdaMargins`, `returnOnEquity`, `returnOnAssets`, `debtToEquity`, `currentRatio`, `quickRatio`, `freeCashflow`, `operatingCashflow`, `pegRatio`, `targetHighPrice`, `targetLowPrice`, `targetMeanPrice`, `targetMedianPrice`, `recommendationMean`, `recommendationKey`, `numberOfAnalystOpinions`
- ⚠️ **Importante:** `trailingPE`, `priceEarnings` mudam todo dia (preço-dependente). Múltiplos que dependem de balanço só mudam a cada quarter.
- **Wrapper Sulfur:** `/api/asset/[symbol]` (mode=current embutido)

### `/api/v2/stocks/financial-data` — Indicadores fundamentalistas
- **Usa pra:** gross/profit margin, ROE, ROA, debt/equity, current ratio, FCF, revenueGrowth
- **Campos:** `currentPrice`, `targetHighPrice`, `targetLowPrice`, `targetMeanPrice`, `targetMedianPrice`, `recommendationMean`, `recommendationKey`, `numberOfAnalystOpinions`, `totalCash`, `totalCashPerShare`, `ebitda`, `totalDebt`, `quickRatio`, `currentRatio`, `totalRevenue`, `freeCashflow`, `operatingCashflow`, `revenueGrowth`, `earningsGrowth`, `grossMargins`, `operatingMargins`, `profitMargins`, `returnOnEquity`

### `/api/v2/stocks/balance-sheet-history` — Balanço Patrimonial
- **Period:** annual | quarterly
- **Usa pra:** totalAssets, totalLiab, totalEquity, debt, cash, current ratio, debt/equity

### `/api/v2/stocks/income-statement-history` — DRE
- **Period:** annual | quarterly
- **Usa pra:** totalRevenue, costOfRevenue, grossProfit, operatingIncome, netIncome, ebitda, ebit, basicEarningsPerShare, dilutedEarningsPerShare, **earningsPerShare**, researchDevelopment, sellingGeneralAdministrative
- ⚠️ **EPS trimestral está AQUI** (`incomeStatementHistoryQuarterly`), não em `defaultKeyStatisticsHistory`

### `/api/v2/stocks/cash-flow-history` — Fluxo de Caixa
- **Usa pra:** operatingCashflow, freeCashflow, capitalExpenditures, dividendsPaid

### `/api/v2/stocks/value-added` — DVA
- **Usa pra:** distribuição do valor adicionado (governo, funcionários, financiadores, reinvestimento, acionistas)

### `/api/v2/stocks/dividends` — Dividendos
- **Usa pra:** histórico de proventos, dividend yield calculado

### `/api/v2/peer-benchmarks/{ticker}` — Peers do subsetor
- **Usa pra:** lista de ativos do mesmo subsetor B3
- **Já usado em:** `/asset/[symbol]` → `<PERatioComparison>`
- **Wrapper Sulfur:** `/api/peer-benchmarks/[symbol]` (já existe)

### `/api/v2/tickers/renames` — Renomes conhecidos
- **Usa pra:** normalizar tickers antigos (ex: VVAR3 → BHIA3)
- **Free, sem auth**

### `/api/v2/tickers/coverage` — Cobertura por ticker
- **Usa pra:** saber o que existe pra um ticker antes de chamar

### `/api/v2/tickers/resolve` — Converte ticker antigo
- **Free, sem auth**

### `/api/v2/news/multi?tickers=A,B` — Notícias multi-fonte
- **Usa pra:** feed de notícias B3 (já usado em /asset/[symbol] e /home)

## Endpoints conhecidos MAS não usados ainda

- `/api/v2/options/chain` — cadeia de opções
- `/api/v2/options/analytics` — gregas + IV
- `/api/v2/options/vencimentos` — datas de vencimento
- `/api/v2/futuros/curva-de-vencimentos` — curva de juros futura (DI)
- `/api/v2/futuros/lista` — lista de contratos futuros
- `/api/v2/futuros/historico` — candles de futuros
- `/api/v2/macro` — séries macro disponíveis
- `/api/v2/macro/latest` — último valor de cada série
- `/api/v2/currency` — cotações de moedas
- `/api/v2/crypto` — cotações de cripto
- `/api/v2/tesouro-direto/list` + `/indicators` + `/indicators/history` — Tesouro Direto
- `/api/v2/fii/*` — FIIs (cotação, dividendos, indicadores, imóveis, cartera, etc)
- `/api/v2/funds/*` — outros fundos (FIAGRO, FIDC, FIP, FI-Infra)

## Observações

### P/L (trailingPE) — quando usar
- `quote.regularMarketPrice` muda todo dia → `trailingPE` muda todo dia
- Brapi retorna `priceEarnings` (que é TTM) e `trailingPE` no `defaultKeyStatistics`
- **Sufur usa:** `metrics.trailingPE` (do `defaultKeyStatistics`)
- **Fallback no client:** `price / eps` se trailingPE null

### P/L histórico (bandas)
- Endpoint: `/api/v2/stocks/statistics?symbols=X&mode=history&period=quarterly`
- Retorna série de `trailingPE` por quarter
- Útil pra mostrar banda de "caro/barato vs história"

### EPS trimestral
- `bundle.metrics.eps` é **TTM** (soma de 4 quarters)
- `bundle.historicals.incomeQuarterly[].basicEarningsPerShare` é **por quarter**
- **Sufur atual:** lê incomeQuarterly direto do bundle

### price target (analyst)
- `financialData.targetMeanPrice`, `targetHighPrice`, `targetLowPrice`, `targetMedianPrice`
- **Sufur usa:** já implementado no `<PriceTargetChart>`

### Beat/Miss (consenso)
- **brapi NÃO retorna estimativa de consenso pré-resultado** (precisaria Zacks/Refinitiv)
- Logo: **não usar badge "Beat/Miss" sem ter a estimativa**

## Workflow de feature nova

```
1. X é dado de quê? (preço? fundamental? macro? options?)
2. brapi tem endpoint? (consultar este doc + sitemap)
3. se tem → usar o endpoint diretamente
4. se não tem → outro lugar (ex: balanço trimestral em income-statement-history)
5. se realmente não tem → calcular de outro endpoint (mas documentar no código)
```

## Próximas features que brapi já dá suporte

| feature | endpoint | complexidade |
|---|---|---|
| bandas históricas de P/L (comparar atual vs história) | `statistics?mode=history&period=quarterly` | baixa |
| candles de índice IBOV (separado) | `quote/^BVSP?range=...` | baixa |
| valuation DDM | calculado (dividend + cost of equity) | média |
| opções calls/puts | `options/chain` + `analytics` | média |
| curva de juros futura (DI) | `futures/curva-de-vencimentos` | média |
| earnings yield vs SELIC (juro real) | `statistics` (earningsYield) + `macro` (SELIC) | média |
| histórico de dividendos | `dividends` | baixa |
| cotação USD/BRL ao vivo | `currency?currency=USD-BRL` | baixa |
| macro: SELIC, IPCA, IGP-M | `macro/latest` | baixa |
| fluxo de caixa (CFO, FCF, CAPEX) | `cash-flow-history` | baixa |
| balanço (debt/assets, current ratio) | `balance-sheet-history` | baixa |
| DVA (distribuição de valor) | `value-added` | média |
