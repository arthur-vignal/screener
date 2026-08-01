/**
 * Semantic search for assets.
 * Two modes:
 *  1. Online mode (Ollama running on http://localhost:11434):
 *     Uses LLM to extract filters from natural language query.
 *  2. Offline mode (no Ollama):
 *     Uses keyword extraction + sector matching to find relevant assets.
 *
 * In both cases, the result is a list of asset symbols that match the intent.
 */

import { cached } from "./cache";
import { COMPANY_NAMES, getCompanyName, getCompanySector } from "./asset-names";

export type SemanticResult = {
  symbols: string[];
  query: string;
  mode: "ollama" | "keyword";
  matchedSectors: string[];
  explanation: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

/**
 * Try to query Ollama. Returns null if unavailable or fails.
 * We use a small model (llama3.2:3b or similar) with a structured prompt.
 */
async function tryOllama(query: string): Promise<SemanticResult | null> {
  const prompt = `You are a stock screener assistant. The user query is: "${query}"

Extract intent and return a JSON object with:
- "symbols": array of ticker symbols (uppercase) that match the query, OR empty array if the query describes a profile (sector, quality, region) without naming specific tickers
- "sectors": array of sectors mentioned (e.g. ["Technology", "Energy", "Healthcare", "Financial Services", "ETF", "Cryptocurrency"])
- "keywords": array of relevant keywords (e.g. ["ai", "cloud", "renewable", "dividend"])

Available sectors: Technology, Media, Semiconductors, Banking, Financial Services, Healthcare, Pharmaceuticals, Retail, Apparel, Restaurants, Beverages, Consumer Staples, Aerospace, Machinery, Industrials, Energy, Automobiles, Telecom, Real Estate, Utilities, Materials, Tobacco, Hotels, Travel, Software, Cybersecurity, Cryptocurrency, ETF, Asset Management, Energy Services, Food Delivery, Mobility, Gaming

Examples:
- "AI companies" -> {"symbols": [], "sectors": ["Technology", "Semiconductors"], "keywords": ["ai"]}
- "petrobras oil gas brazil" -> {"symbols": [], "sectors": ["Energy"], "keywords": ["brazil", "oil"]}
- "apple or microsoft" -> {"symbols": ["AAPL", "MSFT"], "sectors": [], "keywords": []}

Only return the JSON object, nothing else.`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "llama3.2:3b",
        prompt,
        stream: false,
        format: "json",
      }),
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const data = (await r.json()) as { response?: string };
    if (!data.response) return null;
    const parsed = JSON.parse(data.response);
    return { query, mode: "ollama", ...parsed } as SemanticResult;
  } catch {
    return null;
  }
}

/**
 * Keyword-based fallback. Extracts sector names and simple keywords
 * from the query and matches against the asset list.
 */
function keywordSearch(query: string): SemanticResult {
  const q = query.toLowerCase();
  const sectors: string[] = [];
  const symbols: string[] = [];

  // Detect sectors
  const sectorKeywords: Record<string, string[]> = {
    Technology: ["tech", "tecnologia", "software", "saas"],
    Healthcare: ["health", "saúde", "hospital", "pharma", "farma", "biotech"],
    Pharmaceuticals: ["drug", "medicine", "medicamento", "remédio", "pharma"],
    Banking: ["bank", "banco", "lender"],
    "Financial Services": ["finance", "finanças", "payment", "pagamento"],
    Energy: ["energy", "energia", "oil", "petróleo", "gas", "gás", "renewable"],
    Retail: ["retail", "varejo", "store", "loja", "shop"],
    "Consumer Staples": ["consumer", "consumo"],
    Automobiles: ["auto", "car", "carro", "veículo"],
    Telecom: ["telecom", "wireless"],
    Aerospace: ["aerospace", "defense", "defesa"],
    Industrials: ["industrial", "industry"],
    Materials: ["material", "mining", "mineração"],
    Utilities: ["utility", "energia elétrica"],
    "Real Estate": ["real estate", "imobiliário", "reit"],
    "Cryptocurrency": ["crypto", "bitcoin", "ethereum", "blockchain"],
    "Asset Management": ["asset management", "gestora"],
    Cybersecurity: ["cybersecurity", "segurança", "security"],
    Software: ["software"],
    Media: ["media", "mídia"],
    Restaurants: ["restaurant", "food", "comida"],
    Beverages: ["beverage", "drink", "bebida"],
    Apparel: ["apparel", "clothing", "roupa"],
    Hotels: ["hotel", "hospitality"],
    Travel: ["travel", "viagem"],
    ETF: ["etf", "index fund"],
    Tobacco: ["tobacco", "cigarro"],
    Gaming: ["game", "gaming", "jogo"],
    Mobility: ["ride", "rideshare", "uber"],
    "Food Delivery": ["food delivery", "delivery"],
  };

  for (const [sector, words] of Object.entries(sectorKeywords)) {
    if (words.some((w) => q.includes(w))) sectors.push(sector);
  }

  // Direct symbol detection
  for (const sym of Object.keys(COMPANY_NAMES)) {
    if (q.includes(sym.toLowerCase())) symbols.push(sym);
  }
  // Multi-word company name match
  for (const [sym, info] of Object.entries(COMPANY_NAMES)) {
    const nameWords = info.name.toLowerCase().split(/\s+/);
    if (nameWords.every((w) => q.includes(w)) && q.split(/\s+/).some((w) => w.length > 3)) {
      if (!symbols.includes(sym)) symbols.push(sym);
    }
  }

  return {
    query,
    mode: "keyword",
    symbols,
    matchedSectors: sectors,
    explanation: sectors.length > 0
      ? `Detectado: ${sectors.join(", ")}`
      : "Nenhum filtro detectado — mostrando ativos por ticker exato",
  };
}

/**
 * Apply semantic result to filter the asset universe.
 */
export async function semanticSearch(query: string): Promise<{
  results: { symbol: string; name: string; type: "stock" | "etf" | "crypto"; sector: string }[];
  explanation: string;
  mode: "ollama" | "keyword";
}> {
  if (!query.trim()) return { results: [], explanation: "", mode: "keyword" };

  const result = await cached(`semantic:${query.toLowerCase()}`, 600, async () => {
    const ollama = await tryOllama(query);
    return ollama ?? keywordSearch(query);
  });

  // Get all assets to filter
  const { getAllSymbols } = await import("./assets");
  const allSymbols = getAllSymbols();

  const out: { symbol: string; name: string; type: "stock" | "etf" | "crypto"; sector: string }[] = [];

  // If explicit symbols, use them
  if (result.symbols && result.symbols.length > 0) {
    for (const sym of result.symbols) {
      const upper = sym.toUpperCase();
      if (allSymbols.includes(upper)) {
        const type: "stock" | "etf" | "crypto" = upper.includes("-USD")
          ? "crypto"
          : allSymbols.indexOf(upper) < 80
            ? "stock"
            : "etf";
        out.push({
          symbol: type === "crypto" ? upper.replace("-USD", "") : upper,
          name: getCompanyName(upper),
          type,
          sector: getCompanySector(upper),
        });
      }
    }
  }

  // If sectors found, add all matching assets
  if (result.matchedSectors && result.matchedSectors.length > 0) {
    const sectors = new Set(result.matchedSectors.map((s: string) => s.toLowerCase()));
    for (const sym of allSymbols) {
      const sector = getCompanySector(sym).toLowerCase();
      if (sectors.has(sector)) {
        const type: "stock" | "etf" | "crypto" = sym.includes("-USD")
          ? "crypto"
          : allSymbols.indexOf(sym) < 80
            ? "stock"
            : "etf";
        if (!out.find((r) => r.symbol === sym.replace("-USD", ""))) {
          out.push({
            symbol: type === "crypto" ? sym.replace("-USD", "") : sym,
            name: getCompanyName(sym),
            type,
            sector: getCompanySector(sym),
          });
        }
      }
      if (out.length >= 50) break;
    }
  }

  return {
    results: out.slice(0, 50),
    explanation: result.explanation,
    mode: result.mode,
  };
}
