import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

const BASE = "https://query2.finance.yahoo.com";

type Event = {
  date: string;
  type: string;
  description: string;
};

type YahooEvent = {
  date?: string;
  type?: string;
  title?: string;
  description?: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const events = await cached(`events:${ticker}`, 3600, async () => {
      const r = await fetch(`${BASE}/v8/finance/chart/${ticker}?events=div,split,earn`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!r.ok) return [];
      const data = (await r.json()) as {
        chart?: {
          result?: Array<{
            meta?: Record<string, unknown>;
            events?: {
              dividends?: YahooEvent[];
              splits?: YahooEvent[];
              earnings?: { earningsChart?: { quarterly?: YahooEvent[]; currentQuarterEstimate?: unknown }; currentQuarterEstimate?: unknown };
            };
          }>;
        };
      };
      const result = data.chart?.result?.[0];
      if (!result) return [];

      const out: Event[] = [];

      // Earnings (next reported date)
      const earningsChart = result.events?.earnings?.earningsChart;
      if (earningsChart?.quarterly && earningsChart.quarterly.length > 0) {
        const next = earningsChart.quarterly[earningsChart.quarterly.length - 1];
        if (next.date) {
          out.push({
            date: next.date,
            type: "Earnings",
            description: next.title || next.description || "Relatório de resultados",
          });
        }
      }

      // Dividends (next ex-div date)
      const dividends = result.events?.dividends ?? [];
      if (dividends.length > 0) {
        const next = dividends[dividends.length - 1];
        if (next.date) {
          out.push({
            date: next.date,
            type: "Dividend",
            description: next.title || next.description || "Ex-dividend",
          });
        }
      }

      // Splits
      const splits = result.events?.splits ?? [];
      for (const s of splits) {
        if (s.date) {
          out.push({
            date: s.date,
            type: "Split",
            description: s.title || s.description || "Stock split",
          });
        }
      }

      return out.slice(0, 10);
    });

    return NextResponse.json({ events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
