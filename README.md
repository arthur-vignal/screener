# Sulfur.io

Screener de ações estilo "Ledger/Linear-grade UI" cobrindo US + B3 (Brasil) sem custos de dados.

- **Prod:** https://screener-production-4f58.up.railway.app
- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Recharts + SWR + Supabase Postgres + Vercel-style API routes.
- **Auth:** Supabase (login/signup/session/JWT) + perfis custom `profiles`.

## Fontes de dados (estratégia $0/mês + Brapi Pro)

| Fonte | Cobertura | Custo | Auth |
|-------|-----------|-------|------|
| **Yahoo Finance `.SA`** | B3 (BR) | $0 | none |
| **Yahoo Finance** | US | $0 | none |
| **Brapi Pro** | BR (full fundamentals) | R$/mês | `BRAPI_TOKEN` env var |
| **Finnhub** | US | $0 (free tier) | `FINNHUB_API_KEY` env var |
| **SEC EDGAR** | US | $0 | none |
| **Finviz** | US | $0 | scraping |
| **Google News RSS** | fallback | $0 | none |
| **DefiLlama** | crypto macro | $0 | none |
| **CMC** | crypto | $0 | `CMC_API_KEY` env var |

## Env vars

```bash
# Brapi Pro (full BR fundamentals — quote, valuation, profitability, dividends)
BRAPI_TOKEN=...

# Finnhub (US profile + financial metrics)
FINNHUB_API_KEY=...

# CoinMarketCap (crypto)
CMC_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Setup local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Estratégia de fallback

- BR sem `BRAPI_TOKEN` → Yahoo `.SA` apenas (sem fundamentals)
- BR com Brapi indisponível → Yahoo `.SA` apenas
- US sem Finnhub → SEC EDGAR + Finviz
- US sem SEC → Finnhub + Yahoo

## Endpoints principais

| Path | Cobertura | Fonte |
|------|-----------|-------|
| `/asset/[ticker]` | US + BR | US bundle / Brapi Pro |
| `/fundamentals/history/[ticker]` | BR | Brapi Pro |
| `/recommendation/[ticker]` | US + BR | Yahoo + calcula |
| `/scores/[ticker]` | US + BR | agrega métricas |
| `/chart/[ticker]` | US + BR | Yahoo candles |
| `/news/{single,multi}/[ticker]` | US + BR | Google News + Yahoo |

## Estratégia rejeitada

- ❌ Brapi free tier (apenas 4 IBOV whitelisted: PETR4/MGLU3/VALE3/ITUB4)
- ❌ Yahoo `/quoteSummary` (exige crumb cookie, não-autenticado falha)
- ❌ Token paga de qualquer provider fora do que já está no plano

## Princípios de design

1. UI estilo "Ledger/Linear": tipografia mono pra números, display serif pra títulos, paleta neutra com tinta/superfície/cabelo (hairline), zero `border-radius`, tabelas densas.
2. News SEMPRE inline via modal — nunca abre link externo.
3. Range filters = dual-range slider + badge de zona contextual ("Baixa/Média/Alta"), não `<select>`.
4. Colunas toggleáveis via picker de chips; colunas com 0 valores escondidas.
5. Overlays (RSI, etc) default OFF, transição suave.
6. Performance > estética vazia.

