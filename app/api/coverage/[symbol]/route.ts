import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/coverage/[symbol] — pre-flight to decide asset template.
 *
 * Returns Brapi's `availableData` flags + `assetType` for a ticker so the
 * client can suppress sections that don't apply (e.g. no DVA for FII,
 * no income statement for ETF/BDR) without paying for a heavy bundle
 * request just to discover the shape.
 *
 * Spec ref: sulfur-spec-pagina-ativo.md §0 — "Roteamento por tipo de
 * ativo". Confirmed empirically: /stocks/financial-data returns
 * *absence of `data`* (not null fields) for FII/ETF/BDR, so we
 * must check this before trying to render financial sections.
 *
 * Cache: 24h — coverage flags almost never change (re-renames are rare).
 *
 * Brapi endpoint: GET /api/v2/tickers/coverage?symbols=SYM
 *
 * Response shape:
 *   {
 *     symbol: "PETR4",
 *     assetType: "stock" | "etf" | "fii" | "bdr" | "fund" | "crypto" | null,
 *     subType: string | null,
 *     status: "available" | "unavailable" | null,
 *     available: {
 *       quote, historical, profile, statistics,
 *       financialStatements, stockDividends, fiiDividends,
 *       fiiIndicators, fiiReports, fiiPortfolio, fiiProperties
 *     },
 *     recommendedEndpoints: { ... },
 *     fetchedAt: ISO,
 *     source: "brapi-coverage"
 *   }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 15;

const BRAPI_BASE = "https://brapi.dev/api/v2";

type RawCoverageResult = {
  requestedSymbol?: string;
  symbol?: string;
  changed?: boolean;
  status?: string;
  assetType?: string;
  subType?: string;
  availableData?: Record<string, boolean>;
  recommendedEndpoints?: Record<string, string>;
};

type BrapiCoverageResponse = {
  results?: RawCoverageResult[];
  requestedAt?: string;
  took?: number;
};

type CoveragePayload = {
  symbol: string;
  assetType: string | null;
  subType: string | null;
  status: string | null;
  available: {
    quote: boolean;
    historical: boolean;
    profile: boolean;
    statistics: boolean;
    financialStatements: boolean;
    stockDividends: boolean;
    fiiDividends: boolean;
    fiiIndicators: boolean;
    fiiReports: boolean;
    fiiPortfolio: boolean;
    fiiProperties: boolean;
  };
  recommendedEndpoints: Record<string, string>;
  fetchedAt: string;
  source: "brapi-coverage";
};

function emptyFlags(): CoveragePayload["available"] {
  return {
    quote: false,
    historical: false,
    profile: false,
    statistics: false,
    financialStatements: false,
    stockDividends: false,
    fiiDividends: false,
    fiiIndicators: false,
    fiiReports: false,
    fiiPortfolio: false,
    fiiProperties: false,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: raw } = await params;
  const symbol = raw.toUpperCase().replace(/\.SA$/, "");

  if (!/^[A-Z0-9]{4,12}$/.test(symbol)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  const token = process.env.BRAPI_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BRAPI_TOKEN not configured" },
      { status: 500 },
    );
  }

  const payload = await cached<CoveragePayload | null>(
    `brapi-coverage:${symbol}`,
    24 * 60 * 60,
    async () => {
      const url = `${BRAPI_BASE}/tickers/coverage?symbols=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!r.ok) {
        console.error(`[coverage] ${symbol} ${r.status}`);
        return null;
      }
      const json = (await r.json()) as BrapiCoverageResponse;
      const raw = json.results?.[0];
      if (!raw) return null;

      return {
        symbol: raw.symbol ?? symbol,
        assetType: raw.assetType ?? null,
        subType: raw.subType ?? null,
        status: raw.status ?? null,
        available: {
          quote: raw.availableData?.quote ?? false,
          historical: raw.availableData?.historical ?? false,
          profile: raw.availableData?.profile ?? false,
          statistics: raw.availableData?.statistics ?? false,
          financialStatements: raw.availableData?.financialStatements ?? false,
          stockDividends: raw.availableData?.stockDividends ?? false,
          fiiDividends: raw.availableData?.fiiDividends ?? false,
          fiiIndicators: raw.availableData?.fiiIndicators ?? false,
          fiiReports: raw.availableData?.fiiReports ?? false,
          fiiPortfolio: raw.availableData?.fiiPortfolio ?? false,
          fiiProperties: raw.availableData?.fiiProperties ?? false,
        },
        recommendedEndpoints: raw.recommendedEndpoints ?? {},
        fetchedAt: new Date().toISOString(),
        source: "brapi-coverage",
      };
    },
  );

  if (!payload) {
    return NextResponse.json({ error: "coverage unavailable" }, { status: 502 });
  }

  return NextResponse.json(payload);
}
