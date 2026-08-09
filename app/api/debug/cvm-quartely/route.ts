import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const probes: Record<string, unknown> = {};

  const tests = [
    {
      label: "dados.cvm.gov.br (cadastro)",
      url: "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv",
      timeout: 20_000,
    },
    {
      label: "dados.cvm.gov.br (ITR 2026)",
      url: "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2026.zip",
      timeout: 25_000,
    },
    {
      label: "dados.cvm.gov.br (DFP 2025)",
      url: "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_2025.zip",
      timeout: 25_000,
    },
    {
      label: "ri.petrobras.com.br",
      url: "https://ri.petrobras.com.br/",
      timeout: 15_000,
    },
  ];

  for (const t of tests) {
    try {
      const start = Date.now();
      const r = await fetch(t.url, {
        signal: AbortSignal.timeout(t.timeout),
        redirect: "follow",
      });
      const elapsed = Date.now() - start;
      probes[t.label] = {
        ok: r.ok,
        status: r.status,
        size: r.headers.get("content-length"),
        elapsedMs: elapsed,
      };
    } catch (e) {
      probes[t.label] = {
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(probes);
}
