import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/macro/bcb?series=selic,cdi,ibcbr — séries históricas longas
 * do Banco Central (BCB SGS).
 *
 * brapi limita SELIC/CDI a ~500 obs (1.4 anos) e IBC-Br a 10 obs (mensal).
 * BCB SGS dá 10 anos de janela pra séries diárias e todo o histórico pra
 * mensais — ideal pra comparar com históricos longos de ativos.
 *
 * Sem autenticação.
 *
 * Cache 24h (séries macro mudam raramente).
 *
 * Séries usadas:
 *   - selic (sgs 432): meta SELIC anualizada % (já em % a.a.)
 *   - cdi (sgs 4389): CDI % a.a.
 *   - ibcbr (sgs 24363): IBC-Br índice (precisa YoY pra comparar)
 *
 * Limitações BCB SGS:
 *   - Séries diárias: janela máxima de 10 anos
 *   - Séries mensais: sem limite aparente
 *
 * Workaround pra ter > 10 anos de SELIC/CDI: pegar 2 janelas de 10 anos
 * (atual e anterior) e concatenar. Pra hoje isso basta.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BCB_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

const SERIES: Record<
  string,
  { code: number; freq: "daily" | "monthly"; /** converte valor p/ % a.a. */ multiplier: number }
> = {
  selic: { code: 432, freq: "daily", multiplier: 1 }, // já é % a.a.
  cdi: { code: 4389, freq: "daily", multiplier: 1 }, // já é % a.a.
  ibcbr: { code: 24363, freq: "monthly", multiplier: 1 }, // índice (precisa YoY)
  // IPCA 12m (sgs 13522): IPCA acumulado 12 meses, % a.m. anualizado.
  // O valor retornado já é % 12m direto, sem necessidade de cálculo.
  ipca: { code: 13522, freq: "monthly", multiplier: 1 },
};

type Obs = { date: string; value: number };

async function fetchBcbSeries(
  code: number,
  freq: "daily" | "monthly",
): Promise<Obs[]> {
  // BCB SGS limita séries diárias a janela de 10 anos. Pra ter
  // mais, concatenaria 2 janelas, mas a 1ª falha com "Requisição
  // inválida!" em ranges antigos (a série 432 SELIC meta só existe
  // desde 1999). Workaround seguro: pegar 1 janela de 10 anos.
  const today = new Date();
  const tenYearsAgo = new Date(today);
  tenYearsAgo.setFullYear(today.getFullYear() - 10);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const urls: string[] = [];
  if (freq === "daily") {
    // Janela de exatamente 10 anos (BCB exige)
    urls.push(
      `${BCB_BASE}.${code}/dados?formato=json&dataInicial=${fmt(tenYearsAgo)}`,
    );
  } else {
    // Mensal: pegar 20 anos pra ter mais contexto
    const twentyYearsAgo = new Date(today);
    twentyYearsAgo.setFullYear(today.getFullYear() - 20);
    urls.push(
      `${BCB_BASE}.${code}/dados?formato=json&dataInicial=${fmt(twentyYearsAgo)}`,
    );
  }

  const results: Obs[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) continue;
      const data = (await r.json()) as Array<{ data: string; valor: string }>;
      if (!Array.isArray(data)) continue;
      for (const o of data) {
        // data vem dd/mm/yyyy, converte pra YYYY-MM-DD
        const [d, m, y] = o.data.split("/");
        const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        const v = Number(o.valor);
        if (Number.isFinite(v)) results.push({ date: iso, value: v });
      }
    } catch {
      // ignore — janela indisponível
    }
  }
  // Dedup + sort asc
  const byDate = new Map<string, number>();
  for (const o of results) byDate.set(o.date, o.value);
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

export async function GET(req: NextRequest) {
  const seriesParam = req.nextUrl.searchParams.get("series");
  if (!seriesParam) {
    return NextResponse.json(
      { error: "missing 'series' query param (ex: ?series=selic,cdi,ibcbr)" },
      { status: 400 },
    );
  }
  const requested = seriesParam.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = requested.filter((s) => !(s in SERIES));
  if (unknown.length > 0) {
    return NextResponse.json(
      {
        error: `unknown series: ${unknown.join(", ")}. Valid: ${Object.keys(SERIES).join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    // Cache por combinação de séries + janela (hoje).
    // Chave estável por 24h; reseta quando brapi/BCB atualizarem.
    const cacheKey = `bcb:macro:v1:${requested.sort().join(",")}`;
    const data = await cached(cacheKey, 24 * 60 * 60, async () => {
      const out: Record<string, Obs[]> = {};
      for (const slug of requested) {
        const meta = SERIES[slug];
        out[slug] = await fetchBcbSeries(meta.code, meta.freq);
      }
      return out;
    });

    return NextResponse.json({ series: data, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: "BCB indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}
