/**
 * /api/assets/quote — cotações paginadas por tipo de ativo.
 *
 * Filtra B3_LIST via `classifyB3Ticker` pelo tipo selecionado (stock |
 * fii | etf | bdr), pega a página solicitada (page + pageSize, default
 * page=1 pageSize=50) e retorna rows + `totalPages` + `total`.
 *
 * B3 tem ~1184 tickers — não dá pra puxar tudo de uma vez. Plano Pro do
 * brapi limita a 19 symbols/req, então pra página de 50 são 3 requests
 * paralelas (quote + candles em batch).
 *
 * Cache 60s (quote) + 1h (candles). Servidor-side via `cached()`.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBrapiQuoteBatchLight } from "@/lib/brapi-quote-batch";
import { isBrazilianTicker, brapiQuote } from "@/lib/brapi";
import { B3_LIST } from "@/lib/b3-list";
import { classifyB3Ticker, type BrAssetType } from "@/lib/b3-classify";
import { IBOV_BY_SYMBOL } from "@/lib/ibovespa";
import { cached } from "@/lib/cache";

const BRAPI_BASE = "https://brapi.dev/api";
const BATCH_LIMIT = 19;
const RANK_LIMIT = 2000;

type B3RankEntry = {
  /** Rank na lista do brapi /available (free-float mkt cap desc). */
  ffRank: number;
  /** Market cap total em BRL. `null` se brapi não retornou. */
  marketCap: number | null;
};

/**
 * Map { symbol → { ffRank, marketCap } } pra TUDO que está em
 * B3_LIST. Cache 24h server-side.
 *
 * 1) `/available?sortBy=market-cap-basic&sortOrder=desc&limit=2000`
 *    dá a lista completa rankeada por free-float mkt cap (1 request).
 * 2) `/v2/stocks/quote?symbols=X,Y,Z` em chunks de 19 dá o `marketCap`
 *    total de cada um (~53 requests pra 1000+ tickers, paralelo).
 * 3) Combina: símbolo → { ffRank, marketCap }.
 *
 * O ranking FINAL da /home usa `marketCap` desc (não free-float), com
 * fallback `ffRank` se marketCap não vier. Ativos sem nenhum ficam
 * no fim (alfabético).
 */
async function fetchB3RankAndMarketCap(): Promise<Record<string, B3RankEntry>> {
  return cached(
    "b3:rank-and-mcap:v1",
    24 * 60 * 60,
    async () => {
      const t = process.env.BRAPI_TOKEN ?? "";
      const auth = t ? `&token=${encodeURIComponent(t)}` : "";

      // 1) Lista rankeada por free-float mkt cap.
      let ffRanked: string[] = [];
      try {
        const r = await fetch(
          `${BRAPI_BASE}/available?sortBy=market-cap-basic&sortOrder=desc&page=1&limit=${RANK_LIMIT}${auth}`,
          { signal: AbortSignal.timeout(20_000) },
        );
        if (r.ok) {
          const data = (await r.json()) as { stocks?: string[] };
          ffRanked = data.stocks ?? [];
        }
      } catch {
        // ignore — usa só market cap
      }

      const out: Record<string, B3RankEntry> = {};
      ffRanked.forEach((s, i) => {
        out[s] = { ffRank: i + 1, marketCap: null };
      });

      // 2) Pega market cap em batches de 19 (limite Pro do brapi).
      const allSymbols = Array.from(
        new Set<string>([...ffRanked, ...B3_LIST]),
      );
      for (let i = 0; i < allSymbols.length; i += BATCH_LIMIT) {
        const batch = allSymbols.slice(i, i + BATCH_LIMIT);
        try {
          const quotes = await brapiQuote(batch);
          for (const sym of batch) {
            const q = quotes.get(sym.toUpperCase());
            const mc = q?.marketCap ?? null;
            const existing = out[sym] ?? {
              ffRank: Number.MAX_SAFE_INTEGER,
              marketCap: null,
            };
            out[sym] = { ...existing, marketCap: mc ?? existing.marketCap };
          }
        } catch {
          // skip batch
        }
      }

      return out;
    },
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;
const TYPE_VALUES = new Set(["stock", "fii", "etf", "bdr"]);

type QuoteBatch = Awaited<ReturnType<typeof getBrapiQuoteBatchLight>>;

/**
 * Colapsa ações ON/PN duplicadas: quando a mesma empresa tem tanto
 * a ação ordinária (termina em 3) quanto a preferencial (termina em 4),
 * mantém só a PN (termina em 4). PN é consistentemente mais líquida
 * no Brasil. Só aplica a stocks.
 *
 * Edge case: algumas empresas têm só ON (BBSE3, BBAS3) — mantém.
 * Outras têm só PN (ITSA4 sem ITSA3) — mantém. Algumas têm PNA
 * (termina em 5, ex: BPAC5) que é mais líquido que a ON — se existir
 * 5 E 3, preferimos 5. Mesma lógica pro 6 (PNB) com 3.
 */
function collapseOnPn(
  symbols: string[],
  type: BrAssetType,
): string[] {
  if (type !== "stock") return symbols;

  const set = new Set(symbols);
  const out: string[] = [];

  for (const sym of symbols) {
    // Pula a ON (termina em 3) se a mesma empresa tem versão
    // preferencial mais alta (4=PN, 5=PNA, 6=PNB, 7=PN-Gold).
    // Hierarquia: 7 > 6 > 5 > 4 > 3.
    if (sym.endsWith("3") && sym.length >= 4) {
      const root = sym.slice(0, -1);
      // Procura do sufixo mais alto pro mais baixo. Se qualquer
      // um existe, pula a ON.
      if (
        set.has(root + "7") ||
        set.has(root + "6") ||
        set.has(root + "5") ||
        set.has(root + "4")
      ) {
        continue;
      }
    }
    out.push(sym);
  }

  return out;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const typeParam = (params.get("type") ?? "stock").toLowerCase();
  if (!TYPE_VALUES.has(typeParam)) {
    return NextResponse.json(
      { error: `invalid type: ${typeParam}` },
      { status: 400 },
    );
  }
  const type = typeParam as BrAssetType;

  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const pageSizeRaw = Number(params.get("pageSize") ?? PAGE_SIZE_DEFAULT);
  const pageSize = Math.max(1, Math.min(PAGE_SIZE_MAX, pageSizeRaw));

  // Filtra B3_LIST pelo tipo. Strip ".SA" se vier (B3_LIST é limpo mas
  // alguns callers mandam sufixo).
  const allOfTypeUnordered = B3_LIST.filter((s) => {
    const clean = s.endsWith(".SA") ? s.slice(0, -3) : s;
    return classifyB3Ticker(clean) === type;
  });

  // Colapsa ON/PN: se a mesma empresa tem ações ON (termina em 3)
  // E PN (termina em 4), mantém só a PN. Mais líquido no Brasil.
  // Só aplica a stocks (FII/ETF/BDR não têm ON/PN).
  // Edge case: PNA (termina em 5) também é preferencial mas tem volume
  // alto — vamos manter se existir (ex: BPAC5 é mais líquido que BPAC3).
  const allUniqueShares = collapseOnPn(allOfTypeUnordered, type);

  // Reordena por market cap total desc (do brapi /v2/stocks/quote,
  // cacheado 24h). Fallback: rank do /available (free-float). Sem
  // nenhum dos dois: alfabético.
  const rankMap = await fetchB3RankAndMarketCap();
  const allOfType = [...allUniqueShares].sort((a, b) => {
    const ra = rankMap[a];
    const rb = rankMap[b];
    const ma = ra?.marketCap;
    const mb = rb?.marketCap;
    // primary: market cap desc
    if (ma != null && mb != null) return mb - ma;
    if (ma != null) return -1; // a tem, b não → a primeiro
    if (mb != null) return 1;  // b tem, a não → b primeiro
    // fallback: ffRank asc
    const ffa = ra?.ffRank ?? Number.MAX_SAFE_INTEGER;
    const ffb = rb?.ffRank ?? Number.MAX_SAFE_INTEGER;
    if (ffa !== ffb) return ffa - ffb;
    // último fallback: alfabético
    return a.localeCompare(b);
  });

  const total = allOfType.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageSymbols = allOfType.slice(start, start + pageSize);

  if (pageSymbols.length === 0) {
    return NextResponse.json({
      rows: [],
      page,
      pageSize,
      total,
      totalPages,
    });
  }

  const quoteMap: QuoteBatch = await getBrapiQuoteBatchLight(pageSymbols);

  try {
    const rows = pageSymbols.map((sym) => {
      const upper = sym.toUpperCase();
      const b = quoteMap.get(upper);
      const isBr = isBrazilianTicker(upper);

      if (!b) {
        return {
          symbol: upper,
          type: "stock" as const,
          sector: IBOV_BY_SYMBOL[upper]?.sector ?? "—",
          quote: null,
          metrics: { marketCap: null },
        };
      }

      const currency = b.currency || (isBr ? "BRL" : "USD");
      const sector = b.sector ?? IBOV_BY_SYMBOL[upper]?.sector ?? "—";

      return {
        symbol: upper,
        type: "stock" as const,
        sector,
        quote: {
          symbol: upper,
          price: b.price ?? 0,
          prevClose: b.prevClose ?? 0,
          change: b.change ?? 0,
          changePercent: b.changePercent ?? 0,
          changePercent7d: b.changePercent7d ?? null,
          changePercent30d: b.changePercent30d ?? null,
          currency,
          dayHigh: b.dayHigh ?? 0,
          dayLow: b.dayLow ?? 0,
          dayOpen: b.dayOpen ?? 0,
          volume: b.volume ?? 0,
          fiftyTwoWeekHigh: b.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: b.fiftyTwoWeekLow ?? 0,
        },
        metrics: {
          marketCap: b.marketCap ?? null,
          pe: null,
          pb: null,
          roe: null,
          roic: null,
          netMargin: null,
          operatingMargin: null,
          eps: null,
          bookValuePerShare: null,
          dividendYield: null,
        },
      };
    });

    return NextResponse.json({
      rows,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}