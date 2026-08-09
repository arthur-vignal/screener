import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: CVM cadastro
  try {
    const r = await fetch(
      "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv",
      { signal: AbortSignal.timeout(15_000) },
    );
    results.cvmCadastro = {
      ok: r.ok,
      status: r.status,
      size: r.headers.get("content-length"),
    };
  } catch (e) {
    results.cvmCadastro = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test 2: Yahoo
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA", {
      signal: AbortSignal.timeout(15_000),
    });
    results.yahoo = { ok: r.ok, status: r.status };
  } catch (e) {
    results.yahoo = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test 3: Google
  try {
    const r = await fetch("https://www.google.com", {
      signal: AbortSignal.timeout(10_000),
    });
    results.google = { ok: r.ok, status: r.status };
  } catch (e) {
    results.google = { error: e instanceof Error ? e.message : String(e) };
  }

  // Test 4: GitHub
  try {
    const r = await fetch("https://github.com", {
      signal: AbortSignal.timeout(10_000),
    });
    results.github = { ok: r.ok, status: r.status };
  } catch (e) {
    results.github = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json(results);
}
