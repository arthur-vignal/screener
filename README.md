# Screener

Stock screener + asset analyzer. Next.js 16 + React 19 + Tailwind 4 + TypeScript.

## Features

- **Ações**: lista de ~100 tickers do S&P 500 (Wikipedia) com filtros de mcap, dividend yield e setor
- **Asset detail**: gráfico de preço com SMA 20/50 + RSI 14, métricas fundamentalistas (P/E, P/VP, ROE, dividend yield, etc)
- **Crypto**: top 50 cryptos via CoinPaprika
- **ETFs**: top 50 ETFs via Alpha Vantage
- **Watchlist**: salvar tickers (localStorage, sem DB)
- **Buscar**: filtros estruturados por mcap, yield, setor

## Fontes de dados

- **Finnhub** (grátis, 60 req/min): `/stock/profile2`, `/stock/metric`, `/quote`
- **Yahoo Finance** (não oficial, sem rate limit claro): candles históricos (`/v8/finance/chart`)
- **CoinPaprika** (grátis): top cryptos
- **Alpha Vantage** (grátis, 25 req/dia): ETF profiles
- **Wikipedia**: lista S&P 500 constituents

## Setup local

```bash
npm install
```

Crie `.env.local`:
```
FINNHUB_API_KEY=...
ALPHAVANTAGE_API_KEY=...
```

```bash
npm run dev
```

Abre http://localhost:3000.

## Deploy na Vercel

1. Vai em https://vercel.com/new
2. Importa `arthur-vignal/screener`
3. Em **Environment Variables**, adiciona:
   - `FINNHUB_API_KEY`
   - `ALPHAVANTAGE_API_KEY`
4. Deploy (~3min)
