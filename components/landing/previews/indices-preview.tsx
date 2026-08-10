"use client";

/**
 * IndicesPreview — visual mock of a B3 index page. Shows a sparkline
 * of the index + 3 sample constituents with allocation %.
 */
export function IndicesPreview() {
  const points = Array.from({ length: 40 }, (_, i) => ({
    x: i,
    y: 30 + Math.sin(i / 5) * 10 + (Math.random() - 0.5) * 2,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x * 7},${p.y}`).join(" ");
  const constituents = [
    { ticker: "PETR4", alloc: "9.2%" },
    { ticker: "VALE3", alloc: "8.4%" },
    { ticker: "ITUB4", alloc: "5.8%" },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          IBOV
        </span>
        <span className="num text-[11px] text-[#f2555f]">−1.98%</span>
      </div>
      <svg viewBox="0 0 280 56" className="w-full" preserveAspectRatio="none">
        <path
          d={path}
          stroke="#f5f5f7"
          strokeWidth="1.4"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-3 space-y-1">
        {constituents.map((c) => (
          <div
            key={c.ticker}
            className="flex items-center justify-between text-[10.5px]"
          >
            <span className="num text-white">{c.ticker}</span>
            <div
              className="h-1 rounded-full"
              style={{
                width: `${(parseFloat(c.alloc) / 10) * 100}%`,
                background: "#a78bfa",
              }}
            />
            <span className="num text-[#9a9ba3]">{c.alloc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}