# Screener v2

Stock screener and portfolio analyzer. Built with Next.js 16, Supabase, and Yahoo Finance.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** strict
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth)
- **Yahoo Finance** (quotes, candles, fundamentals)
- **Finnhub** (recommendations, scores)
- **Recharts** (charts)
- **libsql-style async DB** via Supabase RPC

## Setup

### 1. Supabase project

Create a new project at https://supabase.com.

1. Settings → API → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

2. SQL Editor → run migration:
   ```bash
   # In Supabase SQL Editor, paste and run:
   # supabase/migrations/0001_initial.sql
   ```

   This creates tables: `profiles`, `sessions`, `indices`, `portfolios`, `portfolio_holdings`, `portfolio_history`, and the `exec_sql` RPC function.

### 2. Environment variables

Create `.env.local` (not committed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SECRET=any-random-string-for-jwt-signing
FINNHUB_API_KEY=your-finnhub-key  # optional
```

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Deployed on Railway. Set env vars in Railway dashboard and push to `main` — auto-deploys.

## Features

- **Assets**: 503 S&P 500 + 35 ETFs + 50 cryptos, with filters (volatility, RSI, ADX, Sharpe) and column picker
- **Asset detail**: price chart with toggleable SMA/RSI, fundamentals, quantitative recommendation score
- **News**: aggregated from Yahoo Finance + Google News + SEC EDGAR, opens inline
- **Indices**: community-created indices with backtesting
- **Portfolios**: manual portfolios with historical performance tracking
- **Auth**: username + email + password (Supabase Auth)
- **Private/public**: choose visibility per index/portfolio

## Roadmap

- Market statistics dashboard (CoinMarketCap-style)
- Backtesting strategy engine
- Quantitative recommendation model
- Custom index/portfolio detail pages

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # production server
npm run lint     # eslint
```
