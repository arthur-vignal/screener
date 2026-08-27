import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/dictionary — Brapi field labels in PT-BR.
 *
 * Public endpoint (no token needed). Returns `label`, `description`,
 * `calculation`, `type` and `unit` for every documented field across
 * quote / historical / financial-data / futures / options / fii /
 * treasury categories.
 *
 * Spec ref: sulfur-spec-pagina-ativo.md §0 — "Labels e formatação":
 *
 *   > Não manter tabela de tradução no código. GET /api/v2/dictionary é
 *   > público e devolve label, description, calculation, type e unit por
 *   > campo. Usar label como título, description como tooltip e type +
 *   > unit para formatar.
 *
 * Mapping this server-side and serving our own shape keeps the client
 * bundle small and centralises future translations (the dictionary
 * already has PT-BR; ES/EN could be added by passing a query param).
 *
 * Cache: 24h — the dictionary rarely changes.
 *
 * Response shape:
 *   {
 *     fields: Array<{
 *       key: string,
 *       label: string,
 *       description: string | null,
 *       calculation: string | null,
 *       type: "number" | "string" | "boolean" | "date" | "object" | "array",
 *       unit: string | null,
 *       category: string,
 *       endpoints: string[]
 *     }>,
 *     byKey: Record<string, DictionaryField>,
 *     fetchedAt: ISO,
 *     source: "brapi-dictionary"
 *   }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const BRAPI_BASE = "https://brapi.dev/api/v2";

type RawDictionaryField = {
  key: string;
  label: string;
  description?: string | null;
  calculation?: string | null;
  type?: string;
  unit?: string | null;
  category?: string;
  endpoints?: string[];
};

type DictionaryField = {
  key: string;
  label: string;
  description: string | null;
  calculation: string | null;
  type: "number" | "string" | "boolean" | "date" | "object" | "array";
  unit: string | null;
  category: string;
  endpoints: string[];
};

type DictionaryPayload = {
  fields: DictionaryField[];
  byKey: Record<string, DictionaryField>;
  fetchedAt: string;
  source: "brapi-dictionary";
};

const ALLOWED_TYPES = new Set([
  "number",
  "string",
  "boolean",
  "date",
  "object",
  "array",
]);

function normaliseType(t: string | undefined): DictionaryField["type"] {
  if (t && ALLOWED_TYPES.has(t)) return t as DictionaryField["type"];
  return "string"; // safe fallback
}

async function fetchDictionary(): Promise<DictionaryPayload | null> {
  const url = `${BRAPI_BASE}/dictionary`;
  const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) {
    console.error(`[dictionary] ${r.status}`);
    return null;
  }
  const json = (await r.json()) as { fields?: RawDictionaryField[] };
  const raw = json.fields ?? [];

  const fields: DictionaryField[] = raw.map((f) => ({
    key: f.key,
    label: f.label ?? f.key,
    description: f.description ?? null,
    calculation: f.calculation ?? null,
    type: normaliseType(f.type),
    unit: f.unit ?? null,
    category: f.category ?? "unknown",
    endpoints: Array.isArray(f.endpoints) ? f.endpoints : [],
  }));

  const byKey: Record<string, DictionaryField> = {};
  for (const f of fields) byKey[f.key] = f;

  return {
    fields,
    byKey,
    fetchedAt: new Date().toISOString(),
    source: "brapi-dictionary",
  };
}

export async function GET(_req: NextRequest) {
  const payload = await cached<DictionaryPayload | null>(
    "brapi-dictionary:v1",
    24 * 60 * 60,
    fetchDictionary,
  );

  if (!payload) {
    return NextResponse.json({ error: "dictionary unavailable" }, { status: 502 });
  }

  return NextResponse.json(payload);
}
