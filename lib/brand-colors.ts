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

/**
 * Resolve cor dominante de um ticker B3.
 *
 * Estratégia de busca (em ordem):
 *   1. Match exato (PETR4 → verde Petrobras)
 *   2. Fallback pra mesma empresa com classe diferente (PETR3 → PETR4,
 *      BBDC3 → BBDC4, ITUB3 → ITUB4) quando a ação tem classe ON/PN
 *      e só uma das classes está mapeada. Cobertura de "1 mapa cobre
 *      empresa toda" — funciona pra Petrobras, Vale, Itaú, Bradesco,
 *      BB Seguridade, Ambev, Renner, Localiza, WEG, Embraer, Suzano,
 *      etc.
 *   3. Ticker X3 → X4 fallback (convenção B3: maioria de empresas
 *      tem PN como classe mais líquida).
 *   4. Fallback cinza neutro se nenhuma regra casa.
 */
export function getBrandColor(symbol: string): string {
  const key = symbol.toUpperCase().replace(/\.SA$/, "");

  // 1. Match exato
  if (BRAND_COLOR[key]) return BRAND_COLOR[key]!;

  // 2. Tenta mesma base ticker trocando 3↔4 (PETR3 → PETR4)
  if (key.endsWith("3")) {
    const swap4 = `${key.slice(0, -1)}4`;
    if (BRAND_COLOR[swap4]) return BRAND_COLOR[swap4]!;
  } else if (key.endsWith("4")) {
    const swap3 = `${key.slice(0, -1)}3`;
    if (BRAND_COLOR[swap3]) return BRAND_COLOR[swap3]!;
  }

  // 3. Tenta mesma base trocando 5↔6 (BBDC5 → BBDC4 não, mas
  //    ITUB3 → ITUB4 e ITUB5 → ITUB4 são úteis)
  if (key.endsWith("5")) {
    const swap4 = `${key.slice(0, -1)}4`;
    if (BRAND_COLOR[swap4]) return BRAND_COLOR[swap4]!;
  } else if (key.endsWith("6")) {
    const swap3 = `${key.slice(0, -1)}3`;
    if (BRAND_COLOR[swap3]) return BRAND_COLOR[swap3]!;
  }

  // 4. Tenta strip total do último dígito (caso unit/itUB11 etc.)
  const baseTicker = key.replace(/\d+$/, "");
  if (BRAND_COLOR[baseTicker]) return BRAND_COLOR[baseTicker]!;

  return BRAND_COLOR_FALLBACK;
}
