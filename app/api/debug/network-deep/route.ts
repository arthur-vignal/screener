import { NextResponse } from "next/server";
import { lookup } from "dns/promises";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const out: Record<string, unknown> = {};

  // 1. DNS resolution
  for (const host of ["dados.cvm.gov.br", "google.com", "brapi.dev", "query1.finance.yahoo.com"]) {
    try {
      const start = Date.now();
      const result = await lookup(host);
      out[`dns:${host}`] = {
        ok: true,
        address: result.address,
        elapsedMs: Date.now() - start,
      };
    } catch (e) {
      out[`dns:${host}`] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 2. TCP connect (Node net.connect)
  const net = await import("net");
  for (const [host, port] of [
    ["dados.cvm.gov.br", 443],
    ["google.com", 443],
    ["brapi.dev", 443],
  ] as const) {
    const result: Record<string, unknown> = { host, port };
    const start = Date.now();
    try {
      await new Promise<void>((resolve, reject) => {
        const sock = new net.Socket();
        const timer = setTimeout(() => {
          sock.destroy();
          reject(new Error("timeout"));
        }, 8000);
        sock.once("connect", () => {
          clearTimeout(timer);
          sock.destroy();
          resolve();
        });
        sock.once("error", (err) => {
          clearTimeout(timer);
          reject(err);
        });
        sock.connect(port, host);
      });
      result.ok = true;
      result.elapsedMs = Date.now() - start;
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e);
      result.elapsedMs = Date.now() - start;
    }
    out[`tcp:${host}:${port}`] = result;
  }

  // 3. Env vars related to network
  out.env = {
    RAILWAY_STATIC_OUTBOUND_IP: process.env.RAILWAY_STATIC_OUTBOUND_IP ?? null,
    RAILWAY_DEDICATED_IP: process.env.RAILWAY_DEDICATED_IP ?? null,
    RAILWAY_PRIVATE_NETWORK: process.env.RAILWAY_PRIVATE_NETWORK ?? null,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT ?? null,
    RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID ?? null,
    RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME ?? null,
    RAILWAY_REGION: process.env.RAILWAY_REGION ?? null,
  };

  return NextResponse.json(out);
}
