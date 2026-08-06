# Research notes — série temporal de fundamentals + IBOVESPA

## Pendência registrada

**Tabela de fundamentals** — fix aplicado em `components/all-fundamentals.tsx`:
- Layout mudou de "14 colunas em 1 linha" para **grid de categorias (Company, Valuation, Growth, Profitability, Ownership, Technical, Performance)** em cards 2-3 colunas
- Cada card mostra label completo + valor em fonte mono
- Sem scroll horizontal, sem abreviações (Index, ROA, etc aparecem inteiros)

---

## 1. Fonte de série temporal de fundamentals

### 1a. SEC EDGAR XBRL (EUA) — funciona, já temos infra

**Endpoint:** `https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/us-gaap/{concept}.json`

**Caveat técnico:** A SEC retorna `Content-Encoding: gzip` mas envia o body em texto puro. A biblioteca `requests` automaticamente tenta decodificar, o que confunde o parser. Solução: enviar **sem** header `Accept-Encoding` para receber raw.

**Conceitos disponíveis (Apple testado, 338 entries, 2009–2026):**
- `Revenues` — Receita trimestral
- `GrossProfit` — Lucro bruto
- `OperatingIncomeLoss` — EBIT
- `NetIncomeLoss` — Lucro líquido
- `EarningsPerShareDiluted` — EPS
- `EarningsPerShareBasic`
- `CommonStockSharesOutstanding` — Shares
- `WeightedAverageNumberOfDilutedSharesOutstanding`

**Filtro correto para quarterly:** `form=10-Q` AND `fp in (Q1, Q2, Q3)`. NÃO usar `form=10-Q` sozinho (a Apple tem `fp=FY` em alguns 10-K reclassificados).

**Cobertura:** 5-15 anos para a maioria das large caps, 2-5 anos para mid caps. Cobre todas as ~500 empresas do S&P 500.

**Rate limit:** SEC pede User-Agent com nome e email, máximo ~10 req/s. A `lib/sec-edgar.ts` já existente já faz isso. Para o S&P 500 inteiro (500 × 8 concepts = 4000 calls), com cache de 7 dias (fundamentals mudam 1x/trimestre), cabe em pre-fetch único de ~2 min.

**O que ainda falta expor:** a rota `/api/asset/[ticker]` hoje retorna apenas o agregado mais recente do SEC. A série precisa ser exposta como `historicals: { period, eps, revenue, netMargin, ... }[]`. Estimativa: 4-6h de trabalho.

### 1b. CVM Dados Abertos (Brasil) — funciona, free, oficial

**Endpoint:** `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_AAAA.zip` (trimestral) e `.../DFP/DADOS/dfp_cia_aberta_AAAA.zip` (anual).

**Arquivos dentro do ZIP:**
- `itr_cia_aberta_DRE_con_AAAA.csv` — DRE consolidada
- `itr_cia_aberta_BPA_con_AAAA.csv` — Balanço Patrimonial Ativo
- `itr_cia_aberta_BPP_con_AAAA.csv` — Balanço Patrimonial Passivo
- `itr_cia_aberta_DFC_MI_con_AAAA.csv` — Fluxo de Caixa
- `itr_cia_aberta_DMPL_con_AAAA.csv` — Mutações do PL
- `itr_cia_aberta_DRA_con_AAAA.csv` — Resultado Abrangente
- `itr_cia_aberta_composicao_capital_AAAA.csv` — Composição do capital

**Teste com Petrobras (PETR4):**
- 2024-03-31: Receita 117.7B, Lucro 23.8B
- 2024-06-30: Receita 122.2B, Lucro -2.5B
- 2024-09-30: Receita 129.5B, Lucro 32.6B

Encoding: latin-1. Separador: `;`. Moeda: REAL (geralmente em milhares).

**Rate limit:** Não oficial, mas uso razoável. Arquivo ZIP anual ~30MB. Pre-fetch por empresa (não por ano): em vez de baixar ZIP inteiro, usar a API REST que existe em `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/...` mas os endpoints diretos de empresa individual não estão documentados — o caminho via ZIP é o mais estável.

**Tamanho do universo IBOVESPA:** ~88 ações.

### 1c. Brapi (Brasil, terceiros) — funciona, free

**Endpoint:** `https://brapi.dev/api/quote/{ticker}`

**Campos disponíveis (free tier):**
- `marketCap`, `regularMarketPrice`, `currency`, `sector`
- `historicalDataPrice` (price series, range=`max` retorna até 320 pontos = 10+ anos)
- `dividendsData.cashDividends` (histórico de proventos em JSON)

**Campos avançados (token):** P/E, ROE, dividendYield, debt/equity. O token free permite 200 req/dia, PRO permite mais.

**Limitação:** Não encontrei histórico de fundamentals (P/E, ROE ao longo do tempo) no free tier. Brapi tokenizado é a forma mais barata de ter snapshot rico + histórico de preço + dividendos.

### 1d. mfinance.com.br — funciona, mas só snapshot atual

**Endpoint:** `https://mfinance.com.br/api/v1/stocks/{ticker}`

Retorna snapshot com `pe`, `dividendYield`, `marketCap`, `eps`. Sem série temporal.

### 1e. Yahoo Finance — funciona para preço e dividendos

**Endpoint:** `https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?events=div&range=10y`

- Preço: histórico completo
- Dividendos: histórico completo via parâmetro `events=div`
- BR tickers precisam do sufixo `.SA` (PETR4 → PETR4.SA)

Rate limit: Yahoo rotaciona hosts (`query1`, `query2`, `query3`). Multi-host fallback já implementado em `lib/yahoo.ts`.

---

## 2. IBOVESPA — possibilidade real

### 2a. Provedor de preço + snapshot

**Brapi (free)** + **Yahoo (.SA)** = cobre tudo para preço atual + série histórica.

| Ativo | Brapi | Yahoo (.SA) | mfinance | CVM (trimestral) |
|---|---|---|---|---|
| PETR4 | ✅ | ✅ | ✅ | ✅ |
| VALE3 | ✅ | ✅ | ✅ | ✅ |
| ITUB4 | ✅ | ✅ | ✅ | ✅ |
| BBDC4 | ✅ | ✅ | ✅ | ✅ |
| WEGE3 | ✅ | ✅ | ✅ | ✅ |
| BBSE3 | ✅ | ✅ | ✅ | ✅ |
| MGLU3 | ✅ | ✅ | ✅ | ✅ |

### 2b. Provedor de fundamentals

**Para snapshot atual:** Brapi (free) ou mfinance (free) cobrem P/E, dividend yield, market cap. **Mfinance tem mais campos brutos** (pe, eps, roe, div, mc, segment, subSector) mas `roe` voltou None no teste.

**Para série temporal trimestral:** CVM é a única opção gratuita e oficial. CVM ITR (Informações Trimestrais) cobre todas as ~500 empresas listadas no Brasil, com:
- DRE (income statement)
- BPA/BPP (balance sheet)
- DFC (cash flow)
- DMPL (equity)
- composição do capital

### 2c. Composição do índice

**Endpoint oficial B3:** `https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/empresas-listadas.htm` — HTML, precisa parse.

**Alternativa:** Brapi tem `https://brapi.dev/api/quote/list?sortBy=market_cap&sortOrder=desc` que retorna as ~500+ ações. Daí filtrar para IBOVESPA via lista estática.

**Lista IBOVESPA atualizada:** Não tem endpoint oficial. Solução: hardcode a lista em `lib/ibovespa.ts` com os ~88 tickers. Revisar trimestralmente (B3 reavalia o índice).

### 2d. Viabilidade do IBOVESPA no Sulfur

**Esforço estimado:**
- Adicionar `lib/ibov.ts` com lista de tickers (1h)
- Adicionar adapter Brapi/Yahoo `.SA` para preço (2h)
- Adicionar adapter CVM ITR para fundamentals trimestrais (6-8h, parse CSV ~30MB)
- Adicionar rota `/api/asset/[ticker]` com detecção `.SA` (1h)
- Atualizar `lib/universe.ts` para incluir IBOV (1h)
- Adicionar filtro de exchange no screener (2h)

**Total:** ~16-20h de trabalho para ter IBOVESPA completo com série temporal trimestral.

---

## 3. Plano de execução

### Próximo commit (este)
- ✅ Fix da tabela de fundamentals
- (nenhum gráfico ainda — pendente análise do agente de design)

### Próximos commits sugeridos
1. **Endpoints de série temporal SEC** — expor `historicals: { period, eps, revenue, netMargin, ... }[]` na rota `/api/asset/[ticker]`. Semanas de dados, sem custo.
2. **Gráficos de série temporal** (P1) — banda de valuation, crescimento+margens, saúde financeira. Tudo baseado no SEC XBRL.
3. **Gráficos de snapshot** (P2/P3) — régua de performance (Finviz Perf Week/Month/...), radar normalizado, scatter (P2). Já temos dados.
4. **Preço + SMAs + RSI** — temos Yahoo daily + Finviz SMA20/50/200 e RSI(14) como pontos atuais. Overlay de linhas estáticas.
5. **Backfill histórico de valuation band** — combinar preço Yahoo + earnings SEC por trimestre. ~3-4h.
6. **IBOVESPA** — adicionar universo + adapters Brapi/Yahoo/CVM. ~16-20h.

---

## 4. Achados da pesquisa

| Pergunta | Resposta |
|---|---|
| Dá pra puxar série temporal de fundamentals? | **Sim, via SEC XBRL (EUA) e CVM ITR (BR).** Free, oficial, completo. |
| Funciona com todas as 500 do S&P 500? | **Sim, SEC XBRL cobre todas.** Pre-fetch de 2-5 min. |
| Funciona com IBOVESPA? | **Sim, via CVM para fundamentals, Brapi/Yahoo para preço.** |
| Vai custar? | **Não. SEC, CVM, Brapi free, Yahoo já estão sendo usados.** |
| Quanto tempo? | IBOVESPA end-to-end: ~16-20h. EUA série temporal: ~1 commit (4-6h). |
