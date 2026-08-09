/**
 * refresh-cvm.ts — pulls CVM ITR/DFP, parses, and writes per-ticker JSON.
 *
 * Run: `npx tsx scripts/refresh-cvm.ts` (or `npm run refresh-cvm`)
 *
 * Output: lib/cvm-data/[TICKER]/[YYYY]-[Q].json
 *
 * Each JSON contains a slim subset of normalized income/balance fields
 * needed for TTM aggregation. Designed to be small (~1-2KB per file).
 *
 * Run quarterly when new ITR releases land (or annually for DFP).
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

const CVM_DFP_URL = (year: number) =>
  `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_${year}.zip`;
const CVM_ITR_URL = (year: number) =>
  `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_${year}.zip`;

const CVM_CADASTRO_URL =
  "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv";

const IBOV_URL =
  "https://raw.githubusercontent.com/arthur-vignal/screener/main/lib/ibovespa.ts";

const CURRENT_YEAR = new Date().getUTCFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];
const DATA_DIR = join(process.cwd(), "lib", "cvm-data");

type QuarterlyMetrics = {
  endDate: string;
  source: "ITR" | "DFP";
  // Income statement
  totalRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  netIncome: number | null;
  // Balance sheet
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
};

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function unzipToDir(zipPath: string, outDir: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    execFile("unzip", ["-o", zipPath, "-d", outDir], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

type ParsedCsv = {
  rows: Map<string, Record<string, string>[]>;
  header: string[];
};

async function parseCsv(
  path: string,
  opts: { requireOrdemExerc?: boolean } = { requireOrdemExerc: true },
): Promise<ParsedCsv> {
  const fs = await import("node:fs/promises");
  const text = await fs.readFile(path, "latin1");
  const lines = text.split("\n").filter((l) => l.length > 0);
  const header = lines[0].split(";");
  const rows = new Map<string, Record<string, string>[]>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j];
    const cnpj = row["CNPJ_CIA"];
    const date = row["DT_REFER"] ?? "";
    const ordem = row["ORDEM_EXERC"] ?? "";
    const cnpjNorm = cnpj?.replace(/\D/g, "");
    const passOrdem = opts.requireOrdemExerc ? ordem === "ÚLTIMO" : true;
    if (cnpjNorm && passOrdem) {
      const key = date ? `${cnpjNorm}|${date}` : cnpjNorm;
      const existing = rows.get(key);
      if (existing) existing.push(row);
      else rows.set(key, [row]);
    }
  }
  return { header, rows };
}

type IBOVEntry = {
  symbol: string;
  name: string;
  cnpj: string;
  cvm: string;
};

/**
 * Build ticker → CNPJ map from cad_cia_aberta.csv using IBOV names.
 */
async function buildIbovCnpjMap(): Promise<Map<string, IBOVEntry>> {
  const buf = await fetchBuffer(CVM_CADASTRO_URL);
  const fs = await import("node:fs/promises");
  const tmp = join(tmpdir(), `cad-${Date.now()}.csv`);
  await fs.writeFile(tmp, buf);

  const { rows } = await parseCsv(tmp, { requireOrdemExerc: false });
  await fs.unlink(tmp).catch(() => {});

  // Hardcoded mapping from IBOV entries (kept in sync with lib/ibovespa.ts).
  // Using static list avoids an extra fetch of the source file.
  const ibov = [
    { symbol: "ABEV3", name: "AMBEV S.A." },
    { symbol: "ALOS3", name: "ALLOS S.A." },
    { symbol: "ASAI3", name: "ASSAÍ S.A." },
    { symbol: "AURE3", name: "AUREN ENERGIA S.A." },
    { symbol: "AXIA3", name: "AXIA ENERGIA S.A." },
    { symbol: "AZZA3", name: "AZZAS 2154 S.A." },
    { symbol: "B3SA3", name: "B3 S.A." },
    { symbol: "BBAS3", name: "BANCO DO BRASIL S.A." },
    { symbol: "BBDC3", name: "BANCO BRADESCO S.A." },
    { symbol: "BBDC4", name: "BANCO BRADESCO S.A." },
    { symbol: "BBSE3", name: "BB SEGURIDADE PARTICIPAÇÕES S.A." },
    { symbol: "BEEF3", name: "MINERVA S.A." },
    { symbol: "BPAC11", name: "BTG PACTUAL HOLDINGS S.A." },
    { symbol: "BRAP4", name: "BRADESPAR S.A." },
    { symbol: "BRAV3", name: "BRAVA S.A." },
    { symbol: "BRKM5", name: "BRASKEM S.A." },
    { symbol: "CEAB3", name: "C&A MODAS S.A." },
    { symbol: "CMIG4", name: "CEMIG S.A." },
    { symbol: "CMIN3", name: "CSN MINERAÇÃO S.A." },
    { symbol: "COGN3", name: "COGNA EDUCAÇÃO S.A." },
    { symbol: "CPFE3", name: "CPFL ENERGIA S.A." },
    { symbol: "CPLE3", name: "COPEL S.A." },
    { symbol: "CSAN3", name: "COSAN S.A." },
    { symbol: "CSMG3", name: "COPASA S.A." },
    { symbol: "CSNA3", name: "COMPANHIA SIDERÚRGICA NACIONAL S.A." },
    { symbol: "CURY3", name: "CURY S.A." },
    { symbol: "CXSE3", name: "CAIXA SEGURIDADE PARTICIPAÇÕES S.A." },
    { symbol: "CYRE3", name: "CYRELA BRAZIL REALTY S.A." },
    { symbol: "DIRR3", name: "DIRECIONAL ENGENHARIA S.A." },
    { symbol: "EGIE3", name: "ENGIE BRASIL ENERGIA S.A." },
    { symbol: "EMBJ3", name: "EMBRAER S.A." },
    { symbol: "ENEV3", name: "ENEVA S.A." },
    { symbol: "ENGI11", name: "ENERGISA S.A." },
    { symbol: "EQTL3", name: "EQUATORIAL S.A." },
    { symbol: "FLRY3", name: "FLEURY S.A." },
    { symbol: "GGBR4", name: "GERDAU S.A." },
    { symbol: "GOAU4", name: "METALÚRGICA GERDAU S.A." },
    { symbol: "HAPV3", name: "HAPVIDA PARTICIPAÇÕES E INVESTIMENTOS S.A." },
    { symbol: "HYPE3", name: "HYPERA S.A." },
    { symbol: "IGTI11", name: "IGUATEMI S.A." },
    { symbol: "ISAE4", name: "ISA ENERGIA S.A." },
    { symbol: "ITSA4", name: "ITAUSA S.A." },
    { symbol: "ITUB4", name: "ITAÚ UNIBANCO HOLDING S.A." },
    { symbol: "KLBN11", name: "KLABIN S.A." },
    { symbol: "LREN3", name: "LOJAS RENNER S.A." },
    { symbol: "MBRF3", name: "MARFRIG GLOBAL FOODS S.A." },
    { symbol: "MGLU3", name: "MAGAZINE LUIZA S.A." },
    { symbol: "MOTV3", name: "MOTIVA S.A." },
    { symbol: "MRVE3", name: "MRV ENGENHARIA E PARTICIPAÇÕES S.A." },
    { symbol: "MULT3", name: "MULTIPLAN S.A." },
    { symbol: "NATU3", name: "NATURA &CO HOLDING S.A." },
    { symbol: "PETR3", name: "PETRÓLEO BRASILEIRO S.A. PETROBRAS" },
    { symbol: "PETR4", name: "PETRÓLEO BRASILEIRO S.A. PETROBRAS" },
    { symbol: "POMO4", name: "MARCOPOLO S.A." },
    { symbol: "PRIO3", name: "PRIO S.A." },
    { symbol: "PSSA3", name: "PORTO SEGURO S.A." },
    { symbol: "RADL3", name: "RAIA DROGASIL S.A." },
    { symbol: "RAIL3", name: "RUMO S.A." },
    { symbol: "RDOR3", name: "REDE D'OR S.A." },
    { symbol: "RECV3", name: "PETRORECONCAVO S.A." },
    { symbol: "RENT3", name: "LOCALIZA RENT A CAR S.A." },
    { symbol: "SANB11", name: "BANCO SANTANDER (BRASIL) S.A." },
    { symbol: "SBSP3", name: "SABESP S.A." },
    { symbol: "SLCE3", name: "SLC AGRÍCOLA S.A." },
    { symbol: "SMFT3", name: "SMART FIT S.A." },
    { symbol: "SUZB3", name: "SUZANO S.A." },
    { symbol: "TAEE11", name: "TAESA S.A." },
    { symbol: "TIMS3", name: "TIM S.A." },
    { symbol: "TOTS3", name: "TOTVS S.A." },
    { symbol: "UGPA3", name: "ULTRAPAR PARTICIPAÇÕES S.A." },
    { symbol: "USIM5", name: "USINAS SIDERÚRGICAS DE MINAS GERAIS S.A." },
    { symbol: "VALE3", name: "VALE S.A." },
    { symbol: "VAMO3", name: "VAMOS S.A." },
    { symbol: "VBBR3", name: "VIBRA S.A." },
    { symbol: "VIVA3", name: "VIVARA PARTICIPAÇÕES S.A." },
    { symbol: "VIVT3", name: "TELEFÔNICA BRASIL S.A." },
    { symbol: "WEGE3", name: "WEG S.A." },
    { symbol: "YDUQ3", name: "YDUQS PARTICIPAÇÕES S.A." },
  ];

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const map = new Map<string, IBOVEntry>();
  for (const entry of ibov) {
    const target = norm(entry.name);
    const targetTokens = target.split(" ").filter((t) => t.length >= 3);
    let bestCnpj: string | null = null;
    let bestLen = Infinity;
    for (const [key, rowList] of rows) {
      const row = rowList[0];
      // Filter to ACTIVE companies only (cadastro has CANCELADA, SUSPENSO, etc)
      if ((row["SIT"] || "").trim() !== "ATIVO") continue;
      const cnpj = key.split("|")[0];
      const denom = (row["DENOM_COMERC"] || "").trim();
      const denomSocial = (row["DENOM_SOCIAL"] || "").trim();
      // Try BOTH name fields. SABESP only has "SABESP" in DENOM_COMERC;
      // most others only have the full legal name in DENOM_SOCIAL.
      const names = [
        denomSocial && denomSocial !== "--" ? denomSocial : null,
        denom && denom !== "--" ? denom : null,
      ].filter((n): n is string => Boolean(n));
      for (const name of names) {
        const candidate = norm(name);
        let matched = false;
        if (candidate === target) matched = true;
        else if (candidate.includes(target) || target.includes(candidate)) matched = true;
        else if (targetTokens.length > 0) {
          const shorter = candidate.length < target.length ? candidate : target;
          const longer = candidate.length < target.length ? target : candidate;
          const shorterTokens = shorter
            .split(" ")
            .filter((t) => t.length >= 3);
          if (shorterTokens.length > 0 && shorterTokens.every((t) => longer.includes(t))) {
            matched = true;
          }
        }
        if (matched && candidate.length < bestLen) {
          bestCnpj = cnpj;
          bestLen = candidate.length;
        }
      }
    }
    if (bestCnpj) {
      const rowList = rows.get(`${bestCnpj}|`) || Array.from(rows.values()).find((r) => r[0]?.["CNPJ_CIA"]?.replace(/\D/g, "") === bestCnpj);
      const row = rowList?.[0] ?? null;
      map.set(entry.symbol, {
        symbol: entry.symbol,
        name: entry.name,
        cnpj: bestCnpj,
        cvm: row?.["CD_CVM"] ?? "",
      });
    }
  }

  return map;
}

const DRE_ACCOUNTS: Record<string, keyof QuarterlyMetrics> = {
  "3.01": "totalRevenue",
  "3.03": "grossProfit",
  "3.05": "ebit",
  "3.11": "netIncome",
};

const BPA_ACCOUNTS: Record<string, keyof QuarterlyMetrics> = {
  "1": "totalAssets",
};

const BPP_ACCOUNTS: Record<string, keyof QuarterlyMetrics> = {
  "2": "totalLiabilities",
  "2.03": "totalEquity",
};

function pickMetrics(row: Record<string, string> | undefined): Partial<QuarterlyMetrics> {
  if (!row) return {};
  const out: Partial<QuarterlyMetrics> = {};
  // ESCALA_MOEDA: "MIL" = milhares → multiply by 1000. "UNIDADE" / blank = raw.
  const escala = (row["ESCALA_MOEDA"] || "").toUpperCase();
  const scaleFactor = escala === "MIL" ? 1000 : escala === "MILHAO" ? 1_000_000 : 1;
  const v = (k: string) => {
    const raw = row[k];
    if (raw == null || raw === "") return null;
    const n = Number(raw.replace?.(",", ".") ?? raw);
    if (!Number.isFinite(n)) return null;
    return n * scaleFactor;
  };
  if (row["CD_CONTA"] === "3.05") out.operatingIncome = v("VL_CONTA");
  if (row["CD_CONTA"] === "3.11") out.netIncome = v("VL_CONTA");
  if (DRE_ACCOUNTS[row["CD_CONTA"]]) {
    (out as any)[DRE_ACCOUNTS[row["CD_CONTA"]!]] = v("VL_CONTA");
  }
  if (BPA_ACCOUNTS[row["CD_CONTA"]]) {
    (out as any)[BPA_ACCOUNTS[row["CD_CONTA"]!]] = v("VL_CONTA");
  }
  if (BPP_ACCOUNTS[row["CD_CONTA"]]) {
    (out as any)[BPP_ACCOUNTS[row["CD_CONTA"]!]] = v("VL_CONTA");
  }
  return out;
}

async function processZip(
  zipUrl: string,
  source: "ITR" | "DFP",
  cnpjMap: Map<string, IBOVEntry>,
): Promise<number> {
  console.log(`[${source}] downloading ${zipUrl}...`);
  const buf = await fetchBuffer(zipUrl);
  const fs = await import("node:fs/promises");
  const tmp = join(tmpdir(), `cvm-${Date.now()}-${source}.zip`);
  await fs.writeFile(tmp, buf);
  const tmpDir = join(tmpdir(), `cvm-${Date.now()}-${source}`);
  await fs.mkdir(tmpDir, { recursive: true });
  await unzipToDir(tmp, tmpDir);
  await fs.unlink(tmp);

  // Find DRE and BPA/BPP files
  const files = await fs.readdir(tmpDir);
  const dreFile = files.find((f) => f.toLowerCase().includes("dre") && f.toLowerCase().includes("_con_"));
  const bpaFile = files.find((f) => f.toLowerCase().includes("bpa") && f.toLowerCase().includes("_con_"));
  const bppFile = files.find((f) => f.toLowerCase().includes("bpp") && f.toLowerCase().includes("_con_"));

  if (!dreFile) {
    console.warn(`[${source}] no DRE_consolidated file found`);
    await fs.rm(tmpDir, { recursive: true });
    return 0;
  }

  console.log(`[${source}] found DRE file: ${dreFile}`);

  const { rows: dreRows } = await parseCsv(join(tmpDir, dreFile));
  const { rows: bpaRows } = bpaFile ? await parseCsv(join(tmpDir, bpaFile)) : { rows: new Map() };
  const { rows: bppRows } = bppFile ? await parseCsv(join(tmpDir, bppFile)) : { rows: new Map() };
  console.log(`[${source}] dreRows=${dreRows.size} bpaRows=${bpaRows.size} bppRows=${bppRows.size}`);

  // Aggregate by CNPJ+date
  const merged = new Map<string, QuarterlyMetrics>();
  const buildKey = (cnpj: string, date: string) => `${cnpj.replace(/\D/g, "")}|${date}`;

  for (const [key, rowList] of dreRows) {
    const [cnpj, date] = key.split("|");
    const k = buildKey(cnpj, date);
    let entry = merged.get(k);
    if (!entry) {
      entry = {
        endDate: date,
        source,
        totalRevenue: null,
        grossProfit: null,
        operatingIncome: null,
        ebit: null,
        netIncome: null,
        totalAssets: null,
        totalLiabilities: null,
        totalEquity: null,
      };
      merged.set(k, entry);
    }
    for (const row of rowList) {
      Object.assign(entry, pickMetrics(row));
    }
  }
  for (const [key, rowList] of bpaRows) {
    const [cnpj, date] = key.split("|");
    const k = buildKey(cnpj, date);
    const entry = merged.get(k);
    if (entry) {
      for (const row of rowList) Object.assign(entry, pickMetrics(row));
    }
  }
  for (const [key, rowList] of bppRows) {
    const [cnpj, date] = key.split("|");
    const k = buildKey(cnpj, date);
    const entry = merged.get(k);
    if (entry) {
      for (const row of rowList) Object.assign(entry, pickMetrics(row));
    }
  }

  // Write per-ticker JSON
  let written = 0;
  console.log(`[${source}] merged size: ${merged.size}, cnpjMap size: ${cnpjMap.size}`);
  for (const [ticker, ibov] of cnpjMap) {
    const cnpj = ibov.cnpj;
    const tickerDir = join(DATA_DIR, ticker);
    await mkdir(tickerDir, { recursive: true });
    const tickerEntries: QuarterlyMetrics[] = [];
    for (const [key, entry] of merged) {
      if (key.startsWith(`${cnpj}|`)) {
        tickerEntries.push(entry);
      }
    }
    tickerEntries.sort((a, b) => (a.endDate < b.endDate ? -1 : 1));
    if (ticker === 'PETR4') {
      console.log(`  ${ticker}: cnpj(type)=${typeof cnpj} cnpj=${JSON.stringify(cnpj)} entries=${tickerEntries.length} mergedSampleKeys=${Array.from(merged.keys()).slice(0,3).map(k=>JSON.stringify(k)).join(',')}`);
    }
    for (const entry of tickerEntries) {
      const [year, month] = entry.endDate.split("-");
      const q = month === "12" ? "4" : Math.ceil(Number(month) / 3).toString();
      const file = join(tickerDir, `${year}-Q${q}.json`);
      await writeFile(file, JSON.stringify(entry, null, 2));
      written++;
    }
  }

  await fs.rm(tmpDir, { recursive: true });
  return written;
}

async function main() {
  console.log("[refresh-cvm] building IBOV → CNPJ map...");
  const cnpjMap = await buildIbovCnpjMap();
  console.log(`[refresh-cvm] mapped ${cnpjMap.size} of IBOV tickers to CNPJ`);

  await mkdir(DATA_DIR, { recursive: true });

  let total = 0;
  for (const year of YEARS) {
    const w1 = await processZip(CVM_ITR_URL(year), "ITR", cnpjMap).catch((e) => {
      console.warn(`[ITR ${year}] failed: ${e}`);
      return 0;
    });
    total += w1;
    const w2 = await processZip(CVM_DFP_URL(year), "DFP", cnpjMap).catch((e) => {
      console.warn(`[DFP ${year}] failed: ${e}`);
      return 0;
    });
    total += w2;
  }

  console.log(`[refresh-cvm] done. wrote ${total} JSON files to ${DATA_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
