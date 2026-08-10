"use client";

/**
 * CopomPreview — visual mock of the Copom Watch curve. Renders a
 * modeled fixed-income term structure anchored at 14.25% with mild
 * upward slope. No real data; pure CSS/SVG.
 */
export function CopomPreview() {
  const points = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
    x: i * (280 / 7),
    y: 38 - i * 2.5,
  }));
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Curva DI
        </span>
        <span className="num text-[11px] text-[#a78bfa]">+ slope</span>
      </div>
      <svg viewBox="0 0 280 56" className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="copom-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#3fbfb0" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        <line
          x1="0"
          y1="14"
          x2="280"
          y2="14"
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 4"
        />
        <line
          x1="0"
          y1="42"
          x2="280"
          y2="42"
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="2 4"
        />
        <path
          d={path}
          stroke="url(#copom-g)"
          strokeWidth="1.6"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="#a78bfa"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1.5">
        {["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y"].map((t) => (
          <span key={t} className="num text-[8.5px] text-[#65666e]">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}