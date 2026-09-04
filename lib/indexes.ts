/**
 * indexes.ts — registro canônico dos índices B3 expostos no Sulfur.
 *
 * Como a brapi v2 só expõe 2 índices B3 (^BVSP e IFIX.SA) e a UI pede
 * um painel de 9+ índices, mantemos o resto em mock até plugar outra
 * fonte (yfinance, investing.com scraping). Cada entrada tem:
 *
 *   `symbol`      — símbolo canônico (sempre brapi-friendly primeiro;
 *                    usado pra construir a URL brapi)
 *   `brapi`       — símbolo enviado pro brapi (com `^` se necessário);
 *                    null = sem cobertura, usa mock
 *   `name`        — nome curto (ex: "Ibovespa")
 *   `country`     — país (sempre "Brazil" pra B3, mas mantido pra
 *                    futuro i18n)
 *   `mock`        — bloco usado quando `brapi` é null (dados hardcoded)
 *
 * Quando plugar yfinance, basta setar `brapi: null` → `brapi: "^BVSP"`
 * pra cada um e remover o bloco `mock`.
 */

export type IndexEntry = {
  /** Símbolo canônico exibido na URL `/index/[tickerindex]`. */
  symbol: string;
  /** País (bandeira + label "Brazil" / "USA" na tabela Fey). */
  country: "Brazil" | "USA" | "Mexico" | "Canada";
  /** Nome curto exibido. */
  name: string;
  /** Símbolo passado pro brapi v2 (`/stocks/quote`, `/stocks/historical`). */
  brapi: string | null;
  /** Mock: usado quando `brapi` é null. */
  mock: {
    price: number;
    changePercent: number;
    ytdPercent: number;
    /** PlL LTM simulado (índice não tem P/L próprio). */
    peRatio: number;
    /** Div yield anualizado (%). */
    divYield: number;
    /** Mkt cap do índice (USD, mock). */
    marketCap: number;
    /** Volume (USD, mock). */
    volume: number;
  };
};

export const INDEX_REGISTRY: IndexEntry[] = [
  // ── B3 (cobertura real na brapi v2) ──
  {
    symbol: "IBOV",
    country: "Brazil",
    name: "Ibovespa",
    brapi: "^BVSP",
    mock: { price: 0, changePercent: 0, ytdPercent: 0, peRatio: 0, divYield: 0, marketCap: 0, volume: 0 },
  },
  {
    symbol: "IFIX",
    country: "Brazil",
    name: "IFIX",
    brapi: "IFIX.SA",
    mock: { price: 0, changePercent: 0, ytdPercent: 0, peRatio: 0, divYield: 0, marketCap: 0, volume: 0 },
  },
  // ── B3 (mock — brapi não tem) ──
  {
    symbol: "IDIV",
    country: "Brazil",
    name: "IDIV",
    brapi: null,
    mock: { price: 7_241, changePercent: 0.21, ytdPercent: 6.74, peRatio: 11.4, divYield: 5.82, marketCap: 0, volume: 0 },
  },
  {
    symbol: "BDRX",
    country: "Brazil",
    name: "BDRX",
    brapi: null,
    mock: { price: 17_602, changePercent: 0.84, ytdPercent: 12.45, peRatio: 14.1, divYield: 2.18, marketCap: 0, volume: 0 },
  },
  {
    symbol: "SMLL",
    country: "Brazil",
    name: "SMLL",
    brapi: null,
    mock: { price: 2_316, changePercent: -0.18, ytdPercent: -4.21, peRatio: 9.8, divYield: 3.04, marketCap: 0, volume: 0 },
  },
  {
    symbol: "IVBX-2",
    country: "Brazil",
    name: "IVBX-2",
    brapi: null,
    mock: { price: 5_804, changePercent: 0.55, ytdPercent: 9.86, peRatio: 12.6, divYield: 4.12, marketCap: 0, volume: 0 },
  },
  {
    symbol: "IEE",
    country: "Brazil",
    name: "IEE",
    brapi: null,
    mock: { price: 8_152, changePercent: -0.12, ytdPercent: 2.31, peRatio: 8.9, divYield: 6.41, marketCap: 0, volume: 0 },
  },
  {
    symbol: "IBXL-2",
    country: "Brazil",
    name: "IBXL-2",
    brapi: null,
    mock: { price: 16_307, changePercent: 0.03, ytdPercent: 1.02, peRatio: 13.2, divYield: 3.85, marketCap: 0, volume: 0 },
  },
  {
    symbol: "IBRA",
    country: "Brazil",
    name: "IBRA",
    brapi: null,
    mock: { price: 14_532, changePercent: -0.38, ytdPercent: 8.41, peRatio: 10.5, divYield: 4.78, marketCap: 0, volume: 0 },
  },
];

/** Resolve uma entrada por símbolo canônico. */
export function findIndex(symbol: string): IndexEntry | undefined {
  const key = symbol.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return INDEX_REGISTRY.find((e) => e.symbol === key);
}

/** Tipos auxiliares exportados. */
export type IndexLiveQuote = {
  price: number;
  change: number;
  changePercent: number;
  /** Janela curta (2 dias) com close price pra sparkline. */
  recent: Array<{ ts: number; close: number }>;
};

export type IndexLive = {
  symbol: string;
  name: string;
  country: IndexEntry["country"];
  brapi: string | null;
  price: number;
  change: number;
  changePercent: number;
  ytdPercent: number;
  peRatio: number;
  divYield: number;
  marketCap: number;
  volume: number;
  source: "brapi" | "mock";
};
