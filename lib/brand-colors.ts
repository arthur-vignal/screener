/**
 * brand-colors.ts — cor dominante (hex) por ticker B3.
 *
 * Extraída direto das logos oficiais em icons.brapi.dev/svg/<SYMBOL>.
 * Usada pra tingir o background da página do ativo e o fundo dos chips
 * de news com a identidade visual da empresa.
 *
 * Fallback: ticker fora do mapa usa cinza neutro (#475569 — slate-600).
 *
 * Pra adicionar mais tickers: edita o mapa. A chave é o símbolo B3 em
 * maiúsculas (ex: "PETR4", não "petr4" nem "PETR4.SA").
 */
export const BRAND_COLOR: Record<string, string> = {
  // petrolíferas
  PETR4: "#008542", // verde Petrobras
  PRIO3: "#01D2C4", // teal PRIO
  // mineração/siderurgia
  VALE3: "#00939A", // teal Vale
  GGBR4: "#004A8F", // azul Gerdau
  // bancos
  ITUB4: "#01207B", // azul Itaú
  BBDC4: "#E22245", // vermelho Bradesco
  BBSE3: "#2360A5", // azul BB Seguridade
  // bebidas
  ABEV3: "#00448C", // azul Ambev
  // varejo
  LREN3: "#D61F27", // vermelho Renner
  MGLU3: "#0086FF", // azul Magalu
  RENT3: "#00984A", // verde Localiza
  // industrial
  WEGE3: "#005DA4", // azul WEG
  EMBR3: "#0067B1", // azul Embraer
  // outros
  B3SA3: "#033678", // azul-marinho B3
  SUZB3: "#00B35A", // verde Suzano
};

export const BRAND_COLOR_FALLBACK = "#475569"; // slate-600

export function getBrandColor(symbol: string): string {
  const key = symbol.toUpperCase().replace(/\.SA$/, "");
  return BRAND_COLOR[key] ?? BRAND_COLOR_FALLBACK;
}
