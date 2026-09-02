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
  const [items, setItems] = useState<
    { id: string; headline: string }[] | null
  >(null);
  const [fetchMs, setFetchMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    async function load() {
      try {
        const r = await fetch("/api/news/multi", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const mapped = (data?.news ?? []).slice(0, 6).map((it: any) => ({
          id: it.id,
          headline: it.headline,
        }));
        if (!cancelled) {
          setItems(mapped);
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
        SelectionProvider. SEM Skeleton. SEM NewsFeed. Só useEffect +
        setState.{" "}
        {fetchMs !== null && (
          <span>
            fetch: <strong className="text-foreground">{fetchMs}ms</strong>
          </span>
        )}
      </div>

      <div className="max-w-[400px] mx-auto">
        <div
          className="rounded-2xl border border-white/10 bg-[#101116] p-5"
          style={{ minHeight: 560 }}
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold">
            Notícias da B3
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground/70">
            {items === null ? "carregando..." : `${items.length} items`}
          </div>

          <ul className="mt-4 space-y-3">
            {(items ?? Array.from({ length: 6 })).map((item, i) => (
              <li key={item.id ?? i} className="text-[13px] text-foreground/80">
                {items === null
                  ? `▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒`
                  : item.headline}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
// Wed, Sep  2, 2026 12:38:44 AM
