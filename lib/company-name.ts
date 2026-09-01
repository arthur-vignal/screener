/**
 * formatCompanyName — limpa o `longName` da brapi pra uso em UI.
 *
 * Brapi retorna nomes tipo:
 *   - "Petroleo Brasileiro SA Pfd"          (sem acentos, ALL CAPS chunks)
 *   - "ITAU UNIBANCO HOLDING S.A."          (tudo maiúsculo)
 *   - "Banco BTG Pactual S.A."              (mistura)
 *   - "WAL - MART BRASIL"                   (com espaço + hífen ruim)
 *
 * Esta função normaliza pra Title Case com acentos comuns brasileiros
 * preservados. Não tenta ser perfeita — só usável.
 *
 * Regras:
 *   1. Substitui abreviações conhecidas (SA → S.A., etc).
 *   2. Title Case palavra por palavra, mantendo preposições/artigos
 *      lowercase quando não são a primeira palavra.
 *   3. Preserva acentos comuns (Á, É, Í, Ó, Ú, Ã, Õ, Ç) — brapi remove
 *      mas alguns endpoints preservam, então não destruímos.
 */
const ABBREV_MAP: Array<[RegExp, string]> = [
  [/\bS\.?\s?A\.?\b/gi, "S.A."],
  [/\bS\.?\/A\.?\b/gi, "S/A"],
  [/\bCIA\b/g, "Cia."],
  [/\bLTDA\.?\b/gi, "Ltda."],
  [/\bHOLDING\b/gi, "Holding"],
  [/\bON\b/g, "ON"],
  [/\bPN\b/g, "PN"],
  [/\bPFD\b/gi, "PN"],
  [/\bBANCO\b/g, "Banco"],
];

// Palavras que ficam lowercase exceto se forem a primeira.
const LOWERCASE_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "a", "o",
]);

function titleCaseWord(word: string, isFirst: boolean): string {
  if (word.length === 0) return word;
  const lower = word.toLowerCase();
  if (!isFirst && LOWERCASE_WORDS.has(lower)) return lower;
  // Primeira letra maiúscula, resto como está (preserva acentos).
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatCompanyName(raw: string | null | undefined): string {
  if (!raw) return "";

  // 1. Aplica substituições de abreviação.
  let s = raw.trim();
  for (const [re, repl] of ABBREV_MAP) {
    s = s.replace(re, repl);
  }

  // 2. Split em palavras (whitespace), mantém pontuação junto.
  const tokens = s.split(/\s+/).filter(Boolean);
  const out = tokens.map((tok, i) => titleCaseWord(tok, i === 0));

  return out.join(" ").trim();
}
