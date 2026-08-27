import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/macro/ipca — IPCA mensal (variação % do mês).
 *
 * Fonte: API SGS do Banco Central do Brasil — série 433.
 * URL: https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json
 *
 * Não precisa de autenticação. Dados abertos desde 1980.
 *
 * Cache: 24h — IPCA mensal é divulgado no início do mês seguinte e
 * não muda retroativamente (salvo revisões metodológicas raras).
 *
 * Response shape (2026-08-27):
 *   {
 *     ipca: Array<{ year: string; month: string; value: number }>,
 *     fetchedAt: ISO,
 *     source: "bcb-sgs-433"
 *   }
 *
 * Cada `value` é a variação % do mês (ex: 0.53 = 0,53% no mês).
 * Pra deflacionar, usar a variação acumulada 12m (calculada no consumer)
 * ou somar mês a mês: fator_acumulado = Π(1 + valor_i/100) para i em meses.
 */

export const dynamic = "force-dynamic";

type RawBCB = Array<{ data: string; valor: string }>;

function parseDateBR(d: string): { year: string; month: string } | null {
  // Formato "DD/MM/YYYY"
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (!m) return null;
  return { year: m[3], month: m[2] };
}

export async function GET() {
  try {
    const data = await cached("bcbSgs433:ipca:monthly", 24 * 3600, async () => {
      const url =
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json";
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`bcb ${r.status}`);
      const raw = (await r.json()) as RawBCB;
      if (!Array.isArray(raw) || raw.length === 0) return null;

      // BCB retorna "valor": "0.53" como string
      const out: Array<{ year: string; month: string; value: number }> = [];
      for (const row of raw) {
        const d = parseDateBR(row.data);
        const v = parseFloat(row.valor);
        if (d && Number.isFinite(v)) {
          out.push({ year: d.year, month: d.month, value: v });
        }
      }
      // ordena decrescente (mais recente primeiro) — bate com o padrão
      // de keyStatisticsHistory da Brapi pra ficar consistente no consumer
      out.sort((a, b) =>
        a.year !== b.year ? b.year.localeCompare(a.year) : b.month.localeCompare(a.month),
      );
      return out;
    });

    return NextResponse.json({
      ipca: data ?? [],
      fetchedAt: new Date().toISOString(),
      source: "bcb-sgs-433",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "IPCA indisponível", detail: String(err) },
      { status: 502 },
    );
  }
}
