// One-off: map B3 universe -> sector via brapi Pro.
// Read token, paginate /v2/tickers, fetch /v2/stocks/profile in batches of 19,
// save C:/Users/vigna/Downloads/sulfur-sectors-YYYYMMDD-HHMM.json + .csv
const fs = require('fs');
const path = require('path');

const TOKEN = (() => {
  const line = fs.readFileSync('.env.local', 'utf8').split('\n').find((l) => l.startsWith('BRAPI_TOKEN='));
  return line ? line.split('=')[1].trim().replace(/^"|"$/g, '') : '';
})();
if (!TOKEN) { console.error('sem BRAPI_TOKEN'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok && attempt < 3) {
    await sleep(1500 * attempt);
    return fetchJson(url, attempt + 1);
  }
  return res.json();
}

async function listTickersPage(cursor = 0) {
  const u = `https://brapi.dev/api/v2/tickers?limit=500&sortBy=volume&sortOrder=desc${cursor ? `&page=` + Math.floor(cursor / 500) : ''}&token=${TOKEN}`;
  return fetchJson(u);
}

async function allTickers() {
  const all = [];
  // brapi usa /v2/tickers com paginação por page (1,2,3...) + limit.
  let page = 0;
  while (true) {
    page++;
    const url = `https://brapi.dev/api/v2/tickers?limit=500&sortBy=volume&sortOrder=desc&page=${page}&token=${TOKEN}`;
    process.stdout.write(`page ${page}... `);
    const d = await fetchJson(url);
    const arr = d.results || d.tickers || [];
    if (!arr.length) { console.log('stop.'); break; }
    all.push(...arr);
    console.log(`got ${arr.length} (total ${all.length})`);
    const paging = d.pagination || {};
    if (all.length >= (paging.totalItems || Infinity)) break;
    if (arr.length < 500) break; // última página
    await sleep(400);
  }
  return all;
}

async function profileBatch(symbols) {
  const url = `https://brapi.dev/api/v2/stocks/profile?symbols=${encodeURIComponent(symbols.join(','))}&token=${TOKEN}`;
  const d = await fetchJson(url);
  return d.results || [];
}

(async () => {
  const tickers = await allTickers();
  // Filtrar só ações B3 (excluir ETFs, FIIs, BDRs, índices)
  const stocksOnly = tickers.filter((t) => {
    const assetType = (t.assetType || '').toLowerCase();
    return assetType === 'stock';
  });
  console.log(`\ntickers: ${tickers.length}, ações-like: ${stocksOnly.length}`);

  const symbols = stocksOnly.map((t) => t.stock || t.symbol).filter(Boolean);
  const profileBySym = new Map();
  const BATCH = 19;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    process.stdout.write(`profile ${i}/${symbols.length}\r`);
    try {
      const rows = await profileBatch(chunk);
      for (const r of rows) {
        const sym = r.symbol || (r.results && r.results[0] && r.results[0].symbol);
        if (!sym) continue;
        // brapi /stocks/profile aninha campos em `data` (PETR4 -> data.sector="Energia")
        profileBySym.set(sym, { ...r, ...(r.data || {}) });
      }
    } catch (e) {
      console.error(`\nchunk fail at ${i}:`, e.message);
    }
    await sleep(300);
  }
  console.log(`\nprofileBySym: ${profileBySym.size}`);

  // Gerar CSV: ticker,sector,industry,subsector,status,cnpj
  const rows = [];
  let withSector = 0, withoutSector = 0;
  for (const t of stocksOnly) {
    const sym = t.symbol;
    // /v2/tickers já devolve sector + subsector direto pra cada ticker.
    // Fallback pro /profile só se vier null aqui (cobrindo o resto).
    const tSector = t.sector || null;
    const tSubsector = t.subsector || null;
    const p = profileBySym.get(sym);
    const pSector = p?.sector || null;
    const pSubsector = p?.subsector || p?.industry || null;
    const sector = tSector || pSector || '';
    const subsector = tSubsector || pSubsector || '';
    const status = sector ? 'ok' : 'null_sector';
    if (sector) withSector++; else withoutSector++;
    rows.push({ symbol: sym, sector, subsector, status });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '-');
  const outJson = `C:/Users/vigna/Downloads/sulfur-sectors-${stamp}.json`;
  const outCsv = `C:/Users/vigna/Downloads/sulfur-sectors-${stamp}.csv`;
  fs.writeFileSync(outJson, JSON.stringify(rows, null, 2));
  const csv = ['symbol,sector,subsector,status'].concat(
    rows.map((r) => [r.symbol, r.sector, r.subsector, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ).join('\n');
  fs.writeFileSync(outCsv, csv);
  console.log(`\nresultados: with=${withSector} without=${withoutSector}`);
  console.log(`json: ${outJson}`);
  console.log(`csv:  ${outCsv}`);
})();
