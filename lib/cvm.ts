/**
 * CVM (Comissão de Valores Mobiliários) — open data quarterly fundamentals.
 *
 * Source: https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/
 * Format: yearly ZIPs of CSVs (DRE / BPA / BPP — Income / Assets / Liabilities),
 *         each ~30MB, latin-1 encoded, semicolon-separated.
 *
 * Coverage: ALL ~650 active B3 listed companies (open data, free, no auth).
 *           Quarterly ITR (Informações Trimestrais) since 2010.
 *
 * Cache: per-year CSV downloaded once, then parsed per-ticker on demand.
 */

import { cached } from "./cache";

const CVM_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS"; // legacy
const CVM_CADASTRO_URL =
  "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv";

const CURRENT_YEAR = new Date().getUTCFullYear();
const MIN_YEAR = 2018;

/** DRE codes that map to our normalized metrics. */
const DRE_MAP: Record<string, string> = {
  "3.01": "revenue",
  "3.03": "grossProfit",
  "3.05": "ebit",
  "3.11": "netIncome",
};

const BPA_MAP: Record<string, string> = {
  "1": "totalAssets",
  "1.01": "currentAssets",
};

const BPP_MAP: Record<string, string> = {
  "2": "totalLiabilities",
  "2.03": "totalEquity",
};

export type QuarterlyPoint = {
  endDate: string;
  revenue: number | null;
  grossProfit: number | null;
  ebit: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
};

export type FundamentalsHistory = {
  ticker: string;
  cvm: string;
  cnpj: string;
  name: string;
  quarters: QuarterlyPoint[];
  populated: boolean;
};

type CsvRow = {
  CNPJ_CIA: string;
  DT_REFER: string;
  CD_CVM: string;
  DENOM_CIA: string;
  ORDEM_EXERC: string;
  GRUPO_DFP: string;
  CD_CONTA: string;
  DS_CONTA: string;
  VL_CONTA: string;
};

const ACCOUNT_MAP: Record<string, string> = {
  ...DRE_MAP,
  ...BPA_MAP,
  ...BPP_MAP,
};

// DFP (annual statements) — has DRE/BPA/BPP consolidated for every year.
// ITR (quarterly) — only has DRE_consolidated up to ~2023; post-2024 the
// consolidated file was retired. We use DFP as the primary source so the
// parser stays simple and complete across the full range.
const DFP_BASE = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS";
const DFP_URL = (year: number) => `${DFP_BASE}/dfp_cia_aberta_${year}.zip`;
const DRE_URL = DFP_URL;
const BPA_URL = DFP_URL;
const BPP_URL = DFP_URL;

/** Parse the cadastro CVM once (cached). Returns CNPJ (digits-only, 14-char)
 *  → { cvm, name }. */
async function getCnpjToCvmMap(): Promise<Record<string, { cvm: string; name: string }>> {
  return cached("cvm:cadastro", 7 * 24 * 3600, async () => {
    const r = await fetch(CVM_CADASTRO_URL, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`cvm cadastro ${r.status}`);
    // CVM cadastro CSV is latin-1 encoded; Node's fetch defaults to UTF-8
    // which mangles accented chars (ú→U+FFFD). Read as latin-1 explicitly.
    const buf = Buffer.from(await r.arrayBuffer());
    const text = buf.toString("latin1");
    const map: Record<string, { cvm: string; name: string }> = {};
    const lines = text.split("\n");
    const header = lines[0].split(";");
    const cnpjIdx = header.indexOf("CNPJ_CIA");
    const cvmIdx = header.indexOf("CD_CVM");
    const sitIdx = header.indexOf("SIT");
    const denomIdx = header.indexOf("DENOM_COMERC");
    const denomSocialIdx = header.indexOf("DENOM_SOCIAL");
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(";");
      if (cols.length < Math.max(cnpjIdx, cvmIdx, sitIdx)) continue;
      const cnpjRaw = cols[cnpjIdx];
      const cvm = cols[cvmIdx];
      const sit = cols[sitIdx];
      if (!cnpjRaw || !cvm || sit !== "ATIVO") continue;
      const cnpjNorm = cnpjRaw.replace(/\D/g, "").padStart(14, "0");
      // CD_CVM in ITR CSVs is zero-padded to 6 digits; the cadastro CSV
      // already includes the padding for some rows but not all. Normalize.
      const cvmNorm = cvm.replace(/^0+/, "") || "0";
      // Prefer DENOM_COMERC; fall back to DENOM_SOCIAL. Treat the literal
      // "--" (cadastro placeholder for "no commercial name") as empty.
      const denomComerc = (cols[denomIdx] ?? "").trim();
      const denomSocial = (cols[denomSocialIdx] ?? "").trim();
      const name = denomComerc && denomComerc !== "--"
        ? denomComerc
        : denomSocial && denomSocial !== "--"
          ? denomSocial
          : "";
      map[cnpjNorm] = {
        cvm: cvmNorm,
        name,
      };
    }
    return map;
  });
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(";");
  const idx = (k: string) => header.indexOf(k);
  const out: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(";");
    out.push({
      CNPJ_CIA: cols[idx("CNPJ_CIA")] ?? "",
      DT_REFER: cols[idx("DT_REFER")] ?? "",
      CD_CVM: cols[idx("CD_CVM")] ?? "",
      DENOM_CIA: cols[idx("DENOM_CIA")] ?? "",
      ORDEM_EXERC: cols[idx("ORDEM_EXERC")] ?? "",
      GRUPO_DFP: cols[idx("GRUPO_DFP")] ?? "",
      CD_CONTA: cols[idx("CD_CONTA")] ?? "",
      DS_CONTA: cols[idx("DS_CONTA")] ?? "",
      VL_CONTA: cols[idx("VL_CONTA")] ?? "",
    });
  }
  return out;
}

async function getCvmYearZipFiles(
  yearUrl: string,
): Promise<Map<string, CsvRow[]>> {
  const key = `cvm:zip:${yearUrl}`;
  return cached(key, 30 * 24 * 3600, async () => {
    const r = await fetch(yearUrl, {
      signal: AbortSignal.timeout(180_000),
    });
    if (!r.ok) return new Map();
    const buf = await r.arrayBuffer();
    // Use system `unzip` to extract CSVs (Railway images have it).
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const exec = promisify(execFile);
    const fs = await import("fs/promises");
    const os = await import("os");
    const path = await import("path");
    const out = new Map<string, CsvRow[]>();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvm-"));
    const zipPath = path.join(tmpDir, "data.zip");
    await fs.writeFile(zipPath, new Uint8Array(buf));
    try {
      await exec("unzip", ["-o", zipPath, "-d", tmpDir]);
    } catch (e) {
      console.error(`[cvm unzip] failed: ${e}`);
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return out;
    }
    const entries = (await fs.readdir(tmpDir)).filter((f) =>
      f.toLowerCase().endsWith(".csv"),
    );
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      const kind = lower.includes("dre")
        ? "dre"
        : lower.includes("bpa")
          ? "bpa"
          : lower.includes("bpp")
            ? "bpp"
            : null;
      if (!kind) continue;
      if (!lower.includes("_con_")) continue;
      const text = await fs.readFile(path.join(tmpDir, entry), "latin1");
      out.set(kind, parseCsv(text));
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
    return out;
  });
}

export type CvmLookup = {
  cnpj: string;
  cvm: string;
  name: string;
};

export async function lookupCvm(cnpj: string): Promise<CvmLookup | null> {
  const map = await getCnpjToCvmMap();
  const normalized = cnpj.replace(/\D/g, "").padStart(14, "0");
  const found = map[normalized];
  if (!found) return null;
  return { cnpj: normalized, cvm: found.cvm, name: found.name };
}

/**
 * Reverse lookup: given a B3 ticker (e.g. "PETR4"), find the CNPJ registered
 * at CVM. Used when the asset endpoint needs to bridge from a Yahoo-served
 * ticker symbol to the CVM cadastro for historical fundamentals.
 *
 * The cadastro CSV has DENOM_COMERC / DENOM_SOCIAL, not tickers, so we match
 * by the IBOV entry name (lib/ibovespa.ts). If no IBOV match, returns null.
 *
 * Cache: same 7d as getCnpjToCvmMap.
 */
export async function lookupCnpjByTicker(
  ticker: string,
): Promise<CvmLookup | null> {
  const upper = ticker.toUpperCase().replace(/\.SA$/, "");
  return cached(`cvm:lookupByTicker:${upper}`, 7 * 24 * 3600, async () => {
    const { IBOV_BY_SYMBOL } = await import("./ibovespa");
    const entry = IBOV_BY_SYMBOL[upper];
    if (!entry) return null;
    const map = await getCnpjToCvmMap();
    // Normalize both names: strip punctuation, lowercase, collapse whitespace.
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const target = norm(entry.name);
    // Match strategy (in priority order):
    //  1. exact normalized equality
    //  2. one fully contains the other
    //  3. ALL tokens of the shorter string appear in the longer one
    //     (handles "Bradesco PN" → "BANCO BRADESCO S.A." where "bradesco" is
    //     a shared token even though full strings don't substring-match)
    //
    // Prefer the SHORTEST cadastro name (most specific issuer).
    let bestCnpj: string | null = null;
    let bestLen = Infinity;
    const targetTokens = target.split(" ").filter((t) => t.length >= 3);
    for (const [cnpj, info] of Object.entries(map)) {
      const name = norm(info.name);
      if (!name) continue; // skip rows with empty name
      let matched = false;
      if (name === target) {
        matched = true;
      } else if (name.includes(target) || target.includes(name)) {
        matched = true;
      } else if (targetTokens.length > 0) {
        // Token-based: every significant token of the SHORTER string is in
        // the longer one. Compare in both directions.
        const shorterTokens = name.length < target.length
          ? name.split(" ").filter((t) => t.length >= 3)
          : targetTokens;
        const longerStr = name.length < target.length ? target : name;
        if (shorterTokens.length > 0 && shorterTokens.every((t) => longerStr.includes(t))) {
          matched = true;
        }
      }
      if (matched && name.length < bestLen) {
        bestCnpj = cnpj;
        bestLen = name.length;
      }
    }
    if (bestCnpj) {
      const info = map[bestCnpj];
      return { cnpj: bestCnpj, cvm: info.cvm, name: info.name };
    }
    return null;
  });
}

/** Fetch full quarterly history for a CNPJ. */
export async function getCvmHistory(cnpj: string): Promise<{
  cnpj: string;
  cvm: string;
  name: string;
  quarters: Map<string, QuarterlyPoint>;
}> {
  const normalized = cnpj.replace(/\D/g, "").padStart(14, "0");
  return cached(`cvm:history:${normalized}`, 7 * 24 * 3600, async () => {
    const map = await getCnpjToCvmMap();
    const meta = map[normalized];
    if (!meta) {
      return {
        cnpj: normalized,
        cvm: "",
        name: "",
        quarters: new Map(),
      };
    }

    const years = Array.from(
      { length: CURRENT_YEAR - MIN_YEAR + 1 },
      (_, i) => MIN_YEAR + i,
    );

    const yearUrls = years.map((y) => DRE_URL(y)); // all 3 maps to same ZIP URL per year
    // Throttle: max 3 concurrent ZIP downloads.
    const results: Array<Map<string, CsvRow[]>> = [];
    const queue = [...yearUrls];
    const workers = Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) return;
        const m = await getCvmYearZipFiles(next);
        results.push(m);
      }
    });
    await Promise.all(workers);

    const quarterMap = new Map<string, QuarterlyPoint>();

    const apply = (row: CsvRow) => {
      if (row.CNPJ_CIA.replace(/\D/g, "") !== normalized) return;
      if (row.ORDEM_EXERC !== "ÚLTIMO") return;
      const ourField = ACCOUNT_MAP[row.CD_CONTA];
      if (!ourField) return;
      const dt = row.DT_REFER;
      let entry = quarterMap.get(dt);
      if (!entry) {
        entry = {
          endDate: dt,
          revenue: null,
          grossProfit: null,
          ebit: null,
          netIncome: null,
          totalAssets: null,
          totalLiabilities: null,
          totalEquity: null,
          totalDebt: null,
        };
        quarterMap.set(dt, entry);
      }
      const v = Number(row.VL_CONTA.replace(",", "."));
      if (Number.isFinite(v)) {
        (entry as unknown as Record<string, number | null>)[ourField] = v;
      }
    };

    for (const fileMap of results) {
      for (const rows of fileMap.values()) {
        for (const row of rows) apply(row);
      }
    }

    return {
      cnpj: normalized,
      cvm: meta.cvm,
      name: meta.name,
      quarters: quarterMap,
    };
  });
}

/** Sort quarters ascending by endDate and return as array. */
export function sortedQuarters(q: Map<string, QuarterlyPoint>): QuarterlyPoint[] {
  return Array.from(q.values()).sort((a, b) =>
    a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0,
  );
}
