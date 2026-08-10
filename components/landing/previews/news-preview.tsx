"use client";

/**
 * NewsPreview — visual mock of inline news cards. 3 stacked rows with
 * ticker badge + headline + timestamp.
 */
export function NewsPreview() {
  const items = [
    { ticker: "PETR4", headline: "Petrobras anuncia novo plano de dividendos para 2026", time: "12m" },
    { ticker: "VALE3", headline: "Vale reporta queda de 8% na produção de minério no trimestre", time: "1h" },
    { ticker: "MXRF11", headline: "FII XPML11 corta dividendo mensal em 5%", time: "3h" },
  ];
  return (
    <div className="space-y-1.5">
      {items.map((n) => (
        <div
          key={n.headline}
          className="flex items-start gap-2.5 py-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span
            className="num text-[9px] w-9 h-9 rounded-md flex items-center justify-center font-medium text-[#0a0a0c] shrink-0"
            style={{
              background: "#f5f5f7",
              fontFamily: "var(--font-mono)",
            }}
          >
            {n.ticker.slice(0, 4)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] text-white leading-snug line-clamp-2">
              {n.headline}
            </div>
            <div className="num text-[9.5px] text-[#65666e] mt-0.5">
              {n.ticker} · {n.time} ago
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}