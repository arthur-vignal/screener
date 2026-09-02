"use client";

/**
 * /home-debug2 — teste AINDA mais isolado.
 *
 * Removemos até o NewsFeed. Só:
 *   - useEffect que faz fetch e setState
 *   - Renderiza o tamanho de um card de news (count + label)
 *   - Sem TickerLogo, sem Skeleton, sem nada
 *
 * Se TRAVAR aqui: bug é do /api/news/multi server-side segurando o
 * main thread do browser via algum pattern ruim (resposta muito grande?
 * stream chunked? headers malucos?).
 *
 * Se NÃO travar: bug é definitivamente no NewsFeed/NewsCard/TickerLogo
 * ou na combinação com skeleton.
 */

import { useEffect, useState } from "react";
import type { JSX } from "react";

export default function HomeDebug2Page(): JSX.Element {
  const [news, setNews] = useState<
    { id: string; headline: string }[] | null
  >(null);
  const [fetchMs, setFetchMs] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    async function load() {
      try {
        const r = await fetch("/api/news/multi", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const items = (data?.news ?? []).slice(0, 6).map((it: any) => ({
          id: it.id,
          headline: it.headline,
        }));
        if (!cancelled) {
          setNews(items);
          setFetchMs(Math.round(performance.now() - t0));
        }
      } catch (e) {
        if (!cancelled) {
          setErr(String(e));
          setFetchMs(Math.round(performance.now() - t0));
        }
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
        /home-debug2 — fetch + useState. Sem NewsFeed, sem Skeleton, sem
        TickerLogo, sem nada.{" "}
        {fetchMs !== null && (
          <span>
            fetch: <strong className="text-foreground">{fetchMs}ms</strong>
          </span>
        )}
        {err && (
          <span className="text-red-400 ml-2">
            err: <strong>{err}</strong>
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
            {news === null
              ? "carregando..."
              : `${news.length} items recebidos`}
          </div>

          <ul className="mt-4 space-y-3">
            {news === null
              ? Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="text-[13px] text-foreground/80">
                    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
                  </li>
                ))
              : news.map((item, i) => (
                  <li key={item.id ?? i} className="text-[13px] text-foreground/80">
                    {item.headline}
                  </li>
                ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
// Wed, Sep  2, 2026 12:38:44 AM
