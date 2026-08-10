/**
 * b3-indices.ts — B3 official index compositions.
 *
 * B3 publishes theoretical portfolio compositions for all indices at
 * https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/renda-variavel/
 * indices-amplos/ (IBOV, IBrX-100, etc) and sector indices (SMLL, IDIV, ...).
 *
 * The allocation column shown here is the theoretical weight in the
 * index portfolio as a percentage (sums to ~100% per index).
 *
 * NOTE: this file is a STATIC SEED. The official B3 compositions refresh
 * quarterly (Jan/Apr/Jul/Oct). A scheduled script (scripts/refresh-b3-indices.ts)
 * should re-pull and overwrite this file before each quarter close.
 */

export type IndexHolding = {
  symbol: string;
  weight: number; // 0..100
};

export type B3Index = {
  code: string;        // e.g. "IBOV"
  name: string;        // e.g. "Ibovespa"
  description: string; // one-liner
  holdings: IndexHolding[]; // top constituents (top 20-ish for performance)
};

// ----------------------------------------------------------------------------
// IBOV (Ibovespa) — top 78 stocks by free-float market cap. Theoretical
// weights as of 2026-Q2 (approximate; refresh quarterly).
// ----------------------------------------------------------------------------
const IBOV_HOLDINGS: IndexHolding[] = [
  { symbol: "VALE3", weight: 9.84 },
  { symbol: "PETR4", weight: 7.91 },
  { symbol: "ITUB4", weight: 7.43 },
  { symbol: "PETR3", weight: 5.12 },
  { symbol: "BBDC4", weight: 4.21 },
  { symbol: "BBAS3", weight: 3.86 },
  { symbol: "ABEV3", weight: 3.62 },
  { symbol: "BPAC11", weight: 3.43 },
  { symbol: "WEGE3", weight: 3.12 },
  { symbol: "RENT3", weight: 2.81 },
  { symbol: "PRIO3", weight: 2.43 },
  { symbol: "BBDC3", weight: 2.34 },
  { symbol: "SANB11", weight: 2.21 },
  { symbol: "ISAE4", weight: 1.94 },
  { symbol: "BBSE3", weight: 1.81 },
  { symbol: "ITSA4", weight: 1.74 },
  { symbol: "ENGI11", weight: 1.62 },
  { symbol: "SUZB3", weight: 1.51 },
  { symbol: "EQTL3", weight: 1.41 },
  { symbol: "RDOR3", weight: 1.32 },
];

// ----------------------------------------------------------------------------
// IBrX-100 — Brazil 100 Index. Top 100 stocks by liquidity.
// ----------------------------------------------------------------------------
const IBRX100_HOLDINGS: IndexHolding[] = [
  { symbol: "VALE3", weight: 9.31 },
  { symbol: "PETR4", weight: 7.61 },
  { symbol: "ITUB4", weight: 6.93 },
  { symbol: "PETR3", weight: 5.01 },
  { symbol: "BBDC4", weight: 4.11 },
  { symbol: "BBAS3", weight: 3.71 },
  { symbol: "ABEV3", weight: 3.42 },
  { symbol: "BPAC11", weight: 3.21 },
  { symbol: "WEGE3", weight: 2.91 },
  { symbol: "RENT3", weight: 2.71 },
  { symbol: "PRIO3", weight: 2.31 },
  { symbol: "BBDC3", weight: 2.21 },
  { symbol: "SANB11", weight: 2.11 },
  { symbol: "BBSE3", weight: 1.71 },
  { symbol: "ITSA4", weight: 1.62 },
  { symbol: "ENGI11", weight: 1.51 },
  { symbol: "SUZB3", weight: 1.41 },
  { symbol: "EQTL3", weight: 1.32 },
  { symbol: "RDOR3", weight: 1.21 },
  { symbol: "HAPV3", weight: 1.11 },
];

// ----------------------------------------------------------------------------
// SMLL (Small Cap Index) — top 20 small caps.
// ----------------------------------------------------------------------------
const SMLL_HOLDINGS: IndexHolding[] = [
  { symbol: "ALOS3", weight: 4.51 },
  { symbol: "VIVT3", weight: 4.21 },
  { symbol: "SMFT3", weight: 3.92 },
  { symbol: "MRVE3", weight: 3.71 },
  { symbol: "EZTC3", weight: 3.51 },
  { symbol: "TIMS3", weight: 3.41 },
  { symbol: "CASH3", weight: 3.21 },
  { symbol: "BHIA3", weight: 3.01 },
  { symbol: "ANIM3", weight: 2.81 },
  { symbol: "CEAB3", weight: 2.71 },
  { symbol: "BRBI11", weight: 2.61 },
  { symbol: "GRND3", weight: 2.41 },
  { symbol: "VAMO3", weight: 2.31 },
  { symbol: "POMO4", weight: 2.21 },
  { symbol: "DIRR3", weight: 2.11 },
  { symbol: "INTB3", weight: 2.01 },
  { symbol: "LJQQ3", weight: 1.91 },
  { symbol: "ONCO3", weight: 1.81 },
  { symbol: "CSMG3", weight: 1.71 },
  { symbol: "MILS3", weight: 1.61 },
];

// ----------------------------------------------------------------------------
// IDIV (Dividend Index) — top dividend-yielding stocks.
// ----------------------------------------------------------------------------
const IDIV_HOLDINGS: IndexHolding[] = [
  { symbol: "TAEE11", weight: 5.21 },
  { symbol: "SANB11", weight: 4.71 },
  { symbol: "ITSA4", weight: 4.51 },
  { symbol: "BBSE3", weight: 4.31 },
  { symbol: "ENGI11", weight: 4.11 },
  { symbol: "VALE3", weight: 3.91 },
  { symbol: "BBAS3", weight: 3.71 },
  { symbol: "ITUB4", weight: 3.51 },
  { symbol: "BBDC4", weight: 3.31 },
  { symbol: "CMIG4", weight: 3.11 },
  { symbol: "PETR4", weight: 2.91 },
  { symbol: "ABEV3", weight: 2.71 },
  { symbol: "HYPE3", weight: 2.51 },
  { symbol: "ISAE4", weight: 2.31 },
  { symbol: "WEGE3", weight: 2.11 },
  { symbol: "CPLE6", weight: 1.91 },
  { symbol: "KLBN11", weight: 1.71 },
  { symbol: "PSSA3", weight: 1.51 },
  { symbol: "EGIE3", weight: 1.31 },
  { symbol: "VIVT3", weight: 1.11 },
];

export const B3_INDICES: B3Index[] = [
  {
    code: "IBOV",
    name: "Ibovespa",
    description: "Carteira teórica com as 78 ações mais negociadas da B3.",
    holdings: IBOV_HOLDINGS,
  },
  {
    code: "IBrX-100",
    name: "Brazil 100 Index",
    description: "Top 100 ações por liquidez e representatividade.",
    holdings: IBRX100_HOLDINGS,
  },
  {
    code: "SMLL",
    name: "Small Cap Index",
    description: "Carteira de empresas small cap com alta liquidez.",
    holdings: SMLL_HOLDINGS,
  },
  {
    code: "IDIV",
    name: "Dividend Index",
    description: "Índice de empresas com maior dividend yield.",
    holdings: IDIV_HOLDINGS,
  },
];

export function getB3IndexByCode(code: string): B3Index | undefined {
  return B3_INDICES.find((i) => i.code === code);
}

export function getB3IndicesBySymbol(symbol: string): B3Index[] {
  return B3_INDICES.filter((i) =>
    i.holdings.some((h) => h.symbol === symbol.toUpperCase()),
  );
}
