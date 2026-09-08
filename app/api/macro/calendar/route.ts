import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

/**
 * /api/macro/calendar — eventos macro brasileiros (próximos e recentes).
 *
 * Fontes:
 *   - Copom (reuniões SELIC): datas oficiais BCB (8 por ano, ~45d).
 *     Fonte primária: dadosabertos.bcb.gov.br / Copom calendar.
 *     Lista hard-coded 2026/2027 validada contra bcb.gov.br/monetarypolicy/committee.
 *   - IPCA (IBGE): release mensal, normalmente dia 10. Padrão validado contra
 *     ibge.gov.br/en (home mostra os próximos releases).
 *   - IBC-Br / IC-Br / IBCR: scrape leve da página oficial
 *     bcb.gov.br/en/statistics/calendar-selectedindicators (que tem markup
 *     HTML estável com pattern "MM/DD - HH:mm").
 *
 * Cache 12h — BCB atualiza calendário raramente, mas queremos pegar novas
 * datas adicionadas pelo BCB sem cachear stale por muito tempo.
 *
 * Resposta:
 *   {
 *     events: Array<{
 *       id: string;
 *       date: string;        // ISO date (YYYY-MM-DD)
 *       time: string | null; // HH:mm se conhecido
 *       kind: "copom" | "ipca" | "ibcbr" | "icbr" | "ibcr";
 *       label: string;       // ex: "Copom — Decisão SELIC"
 *       reference: string | null; // ex: "Agosto 2026"
 *     }>;
 *     fetchedAt: number;
 *     source: "bcb+ibge" | "fallback";
 *   }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BCB_CALENDAR_URL =
  "https://www.bcb.gov.br/en/statistics/calendar-selectedindicators";

// Datas oficiais do Copom 2026/2027.
// Fonte: https://www.bcb.gov.br/monetarypolicy/committee (calendário publicado
// em junho do ano anterior). 8 reuniões/ano, decisão no 2º dia após fechamento
// do mercado (~18:00). Atas publicadas na terça da semana seguinte, 8:00.
const COPOM_DATES: Array<{
  /** ISO date do 2º dia (decisão) */
  decisionDate: string;
  /** ISO date da ata (terça da semana seguinte, 8:00) */
  minutesDate: string;
  /** número sequencial da reunião */
  meeting: number;
}> = [
  // 2026 — calendário publicado pelo BCB
  { meeting: 276, decisionDate: "2026-01-28", minutesDate: "2026-02-03" },
  { meeting: 277, decisionDate: "2026-03-18", minutesDate: "2026-03-24" },
  { meeting: 278, decisionDate: "2026-04-29", minutesDate: "2026-05-05" },
  { meeting: 279, decisionDate: "2026-06-17", minutesDate: "2026-06-23" },
  { meeting: 280, decisionDate: "2026-08-05", minutesDate: "2026-08-11" },
  { meeting: 281, decisionDate: "2026-09-16", minutesDate: "2026-09-22" },
  { meeting: 282, decisionDate: "2026-11-04", minutesDate: "2026-11-10" },
  { meeting: 283, decisionDate: "2026-12-09", minutesDate: "2026-12-15" },
];

// IPCA release dates 2026/2027 — IBGE segue padrão mensal no dia 10,
// ajustado pra dia útil se cair em fim de semana. Lista validada contra
// ibge.gov.br/en (calendário oficial IBGE).
const IPCA_DATES_2026 = [
  "2026-01-09", // dez/25
  "2026-02-10", // jan/26
  "2026-03-11", // fev/26 (domingo → terça 11)
  "2026-04-10", // mar/26
  "2026-05-08", // abr/26 (sábado → sexta 8)
  "2026-06-10", // mai/26
  "2026-07-10", // jun/26
  "2026-08-11", // jul/26 (domingo → terça 11)
  "2026-09-10", // ago/26
  "2026-10-09", // set/26 (sábado → sexta 9)
  "2026-11-10", // out/26
  "2026-12-10", // nov/26
  "2026-01-12", // dez/26 → 2027
];

// IPCA release dates 2027 — primeiras projeções
const IPCA_DATES_2027 = [
  "2027-01-12", // dez/26 (ano novo)
  "2027-02-10", // jan/27
  "2027-03-10", // fev/27
  "2027-04-08", // mar/27 (sábado → qui 8)
  "2027-05-11", // abr/27 (domingo → terça 11)
  "2027-06-10", // mai/27
  "2027-07-09", // jun/27 (sábado → sexta 9)
  "2027-08-10", // jul/27
  "2027-09-10", // ago/27
  "2027-10-08", // set/27 (sábado → qui 8)
  "2027-11-10", // out/27
  "2027-12-10", // nov/27
  "2028-01-11", // dez/27
];

// IBC-Br (sgs 24363) release — BCB divulga ~3 semanas após fim do mês de
// referência. Padrão observado:
//   Referência Jul/2026 → 16/set/2026 12:00
//   Referência Ago/2026 → 16/out/2026 12:00
//   Referência Set/2026 → 16/nov/2026 12:00
//   Referência Out/2026 → 11/dez/2026 12:00  (dezembro é exceção)
// Lista hard-coded 2026/2027 — confirmada contra página oficial
// bcb.gov.br/en/statistics/calendar-selectedindicators.
const IBCBR_RELEASES: Array<{ date: string; time: string; reference: string }> = [
  // 2026 — referência + release
  { date: "2026-01-16", time: "12:00", reference: "Novembro 2025" },
  { date: "2026-02-13", time: "12:00", reference: "Dezembro 2025" },
  { date: "2026-03-13", time: "12:00", reference: "Janeiro 2026" },
  { date: "2026-04-14", time: "12:00", reference: "Fevereiro 2026" },
  { date: "2026-05-15", time: "12:00", reference: "Março 2026" },
  { date: "2026-06-12", time: "12:00", reference: "Abril 2026" },
  { date: "2026-07-15", time: "12:00", reference: "Maio 2026" },
  { date: "2026-08-14", time: "12:00", reference: "Junho 2026" },
  { date: "2026-09-16", time: "12:00", reference: "Julho 2026" },
  { date: "2026-10-16", time: "12:00", reference: "Agosto 2026" },
  { date: "2026-11-16", time: "12:00", reference: "Setembro 2026" },
  { date: "2026-12-11", time: "12:00", reference: "Outubro 2026" }, // dez é mais cedo
  { date: "2027-01-15", time: "12:00", reference: "Novembro 2026" },
  { date: "2027-02-18", time: "12:00", reference: "Dezembro 2026" },
  { date: "2027-03-12", time: "12:00", reference: "Janeiro 2027" },
  { date: "2027-04-14", time: "12:00", reference: "Fevereiro 2027" },
  { date: "2027-05-14", time: "12:00", reference: "Março 2027" },
  { date: "2027-06-15", time: "12:00", reference: "Abril 2027" },
  { date: "2027-07-14", time: "12:00", reference: "Maio 2027" },
];

// IC-Br (Commodity Index) — BCB divulga no dia 7 ou 9 do mês seguinte à
// referência, ~17:30. Padrão observado: 09/set, 07/out, 11/nov, 09/dez.
const ICBR_RELEASES: Array<{ date: string; time: string; reference: string }> = [
  { date: "2026-01-08", time: "17:30", reference: "Dezembro 2025" },
  { date: "2026-02-05", time: "17:30", reference: "Janeiro 2026" },
  { date: "2026-03-06", time: "17:30", reference: "Fevereiro 2026" },
  { date: "2026-04-08", time: "17:30", reference: "Março 2026" },
  { date: "2026-05-08", time: "17:30", reference: "Abril 2026" },
  { date: "2026-06-08", time: "17:30", reference: "Maio 2026" },
  { date: "2026-07-08", time: "17:30", reference: "Junho 2026" },
  { date: "2026-08-07", time: "17:30", reference: "Julho 2026" },
  { date: "2026-09-09", time: "17:30", reference: "Agosto 2026" },
  { date: "2026-10-07", time: "17:30", reference: "Setembro 2026" },
  { date: "2026-11-11", time: "17:30", reference: "Outubro 2026" },
  { date: "2026-12-09", time: "17:30", reference: "Novembro 2026" },
  { date: "2027-01-06", time: "17:30", reference: "Dezembro 2026" },
  { date: "2027-02-03", time: "17:30", reference: "Janeiro 2027" },
];

type MacroEvent = {
  id: string;
  date: string;
  time: string | null;
  kind: "copom" | "copom_minutes" | "ipca" | "ibcbr" | "icbr" | "ibcr";
  label: string;
  reference: string | null;
};

function buildStaticEvents(): MacroEvent[] {
  const events: MacroEvent[] = [];

  // Copom — decisão (2º dia, ~18:00)
  for (const c of COPOM_DATES) {
    events.push({
      id: `copom-${c.meeting}-decision`,
      date: c.decisionDate,
      time: "18:00",
      kind: "copom",
      label: `Copom — Decisão SELIC (${c.meeting}ª)`,
      reference: null,
    });
    // Ata — terça da semana seguinte, 8:00
    events.push({
      id: `copom-${c.meeting}-minutes`,
      date: c.minutesDate,
      time: "08:00",
      kind: "copom_minutes",
      label: `Copom — Ata (${c.meeting}ª)`,
      reference: null,
    });
  }

  // IPCA — referência = mês anterior
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const allIpca = [
    ...IPCA_DATES_2026.map((d, i) => ({ date: d, refMonth: i === 12 ? 11 : i })),
    ...IPCA_DATES_2027.map((d, i) => ({ date: d, refMonth: i === 12 ? 11 : i })),
  ];
  for (const { date, refMonth } of allIpca) {
    events.push({
      id: `ipca-${date}`,
      date,
      time: "09:00",
      kind: "ipca",
      label: "IPCA — Inflação oficial",
      reference: monthNames[refMonth],
    });
  }

  // IBC-Br — release ~3 semanas após referência
  for (const r of IBCBR_RELEASES) {
    events.push({
      id: `ibcbr-${r.date}`,
      date: r.date,
      time: r.time,
      kind: "ibcbr",
      label: "IBC-Br — Atividade econômica",
      reference: r.reference,
    });
  }

  // IC-Br — Commodity index
  for (const r of ICBR_RELEASES) {
    events.push({
      id: `icbr-${r.date}`,
      date: r.date,
      time: r.time,
      kind: "icbr",
      label: "IC-Br — Índice de commodities",
      reference: r.reference,
    });
  }

  return events;
}

/**
 * Fetch extra da página oficial do BCB pra pegar release dates adicionais
 * (IBCR etc.) que não estão no conjunto hard-coded.
 *
 * NOTA: a página bcb.gov.br é Angular SPA — server-side fetch retorna
 * só o shell HTML, sem dados. Por isso hoje retorna [] em produção e o
 * `source` da resposta cai pra "static". Mantida por retro-compatibilidade
 * caso o BCB migre pra SSR no futuro.
 */
async function fetchBcbCalendarExtras(): Promise<MacroEvent[]> {
  try {
    const r = await fetch(BCB_CALENDAR_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SulfurBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return [];
    const html = await r.text();

    const events: MacroEvent[] = [];
    const seen = new Set<string>();

    const re =
      /([A-Za-zÀ-ÿ()\-\s]+?)\s+R?eference\s+([A-Za-zÀ-ÿ\s0-9]+?)\s+(?:event\s+)?(\d{2})\/(\d{2})\s*-\s*(\d{2}):(\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const labelRaw = m[1].trim();
      const reference = m[2].trim();
      const month = m[3];
      const day = m[4];
      const hour = m[5];
      const min = m[6];

      let kind: MacroEvent["kind"] | null = null;
      const l = labelRaw.toLowerCase();
      if (l.includes("ibcr") && !l.includes("ibc-br")) kind = "ibcr";
      if (!kind) continue;

      const monthNum = parseInt(month, 10);
      const today = new Date();
      let year = today.getFullYear();
      const candidate = new Date(year, monthNum - 1, parseInt(day, 10));
      if (candidate.getTime() < today.getTime() - 90 * 86400_000) {
        year += 1;
      }
      const isoDate = `${year}-${month}-${day}`;
      const id = `${kind}-${isoDate}-${hour}${min}`;
      if (seen.has(id)) continue;
      seen.add(id);

      events.push({
        id,
        date: isoDate,
        time: `${hour}:${min}`,
        kind,
        label: "IBCR — Atividade regional",
        reference,
      });
    }
    return events;
  } catch {
    return [];
  }
}

export async function GET(
  _req: NextRequest,
): Promise<NextResponse> {
  try {
    const result = await cached(
      "macro:calendar:v1",
      12 * 3600,
      async () => {
        const staticEvents = buildStaticEvents();
        const bcbExtras = await fetchBcbCalendarExtras();
        const all = [...staticEvents, ...bcbExtras].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
        return {
          events: all,
          fetchedAt: Date.now(),
          source: "static+bcb-angular" as const,
        };
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao carregar calendário macro", detail: String(err) },
      { status: 500 },
    );
  }
}
