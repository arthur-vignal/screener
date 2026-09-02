"use client";

/**
 * /home-debug3 — teste ISOLADO do (app) layout.
 *
 * Esta página NÃO passa por app/(app)/layout.tsx — fica direto em
 * app/home-debug3/page.tsx, então NÃO tem:
 *   - PageFade
 *   - SelectionProvider
 *   - MultiSelectToolbar
 *
 * E mantém o fetch real + render estático.
 *
 * Se TRAVAR aqui: bug é do /api/news/multi server-side (Next.js RSC,
 * chunked transfer, response maluco).
 *
 * Se NÃO travar: bug é no PageFade/SelectionProvider/MultiSelectToolbar.
 */

import { useEffect, useState } from "react";
import type { JSX } from "react";

export default function HomeDebug3Page(): JSX.Element {
  const [count, setCount] = useState<number | null>(null);
  const [fetchMs, setFetchMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    async function load() {
      try {
        const r = await fetch("/api/news/multi", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelled) {
          setCount((data?.news ?? []).length);
          setFetchMs(Math.round(performance.now() - t0));
        }
      } catch {
        if (!cancelled) setFetchMs(Math.round(performance.now() - t0));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="min-h-screen text-foreground p-8"
      style={{ background: "#070709" }}
    >
      <div className="mb-4 text-[12px] text-muted-foreground/70">
        /home-debug3 — fora do (app) layout. Sem PageFade, sem
        SelectionProvider.{" "}
        {fetchMs !== null && (
          <span>
            fetch: <strong className="text-foreground">{fetchMs}ms</strong>
          </span>
        )}
      </div>

      <div className="max-w-[400px] mx-auto">
        <div
          className="rounded-2xl border border-white/10 bg-[#101116] p-5"
          style={{ minHeight: 200 }}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
            Notícias da B3
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground/70">
            {count === null ? "carregando..." : `${count} items`}
          </div>
        </div>
      </div>
    </div>
  );
}
