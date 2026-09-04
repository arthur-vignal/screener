/**
 * indexes.ts — registro canônico dos índices B3 expostos no Sulfur.
 *
 * Fonte primária: **brapi v2** (`lib/brapi.ts`). Brapi tem 2 índices
 * B3 cobertos como índice direto (verificado 2026-09-04):
 *   ^BVSP    → Ibovespa  (preço 185.188 hoje, 250 candles/ano)
 *   IFIX.SA  → IFIX      (preço 3.761, candles anuais completos)
 *
 * Outros 7 índices (SMLL, IDIV, BDRX, IEE, IVBX-2, IBXL-2, IBRA)
 * não estão na brapi como índice — só via ETF (DIVO11, SMAL11, etc)
 * cujo preço DIVERGE da pontuação do índice. Arthur pediu pra
 * descontinuar o proxy via ETF em 2026-09-04 (vai gerar gráficos
 * enganosos).
 *
 * Os 7 ficam mock até uma fonte nova ser plugada (B3 oficial,
 * investing.com scraping). Quando plugar, basta popular `brapi` aqui.
 */

export type IndexEntry = {
  /** Símbolo canônico exibido na URL `/index/[tickerindex]`. */
  symbol: string;
  /** País (bandeira + label "Brazil" / "USA" na tabela Fey). */
  country: "Brazil" | "USA" | "Mexico" | "Canada";
  /** Nome curto exibido. */
  name: string;
  /** Símbolo enviado pra brapi v2 (`^BVSP`, `IFIX.SA`). null = mock. */
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
    /** Mkt cap do índice (mock). */
    marketCap: number;
    /** Volume (mock). */
    volume: number;
  };
};

export const INDEX_REGISTRY: IndexEntry[] = [
  // ── B3 (brapi v2 cobre como índice direto) ──
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
  // ── B3 (mock — brapi não cobre como índice, ETF tem preço divergente) ──
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

export type IndexLive = {
  symbol: string;
  name: string;
  country: IndexEntry["country"];
  /** Símbolo fonte (brapi ou null). */
  source: string | null;
  price: number;
  change: number;
  changePercent: number;
  ytdPercent: number;
  peRatio: number;
  divYield: number;
  marketCap: number;
  volume: number;
  sourceKind: "brapi" | "mock";
};
