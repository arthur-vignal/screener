"use client";

/**
 * CompsPreview — visual mock of a sector radar comparison. Three axes
 * (P/L, ROE, DY) plotted for a single ticker (PETR4) as an irregular
 * triangle.
 */
export function CompsPreview() {
  const cx = 50;
  const cy = 50;
  const r = 36;
  // Modeled scores 0..1 for PETR4 vs sector
  const scores = [0.8, 0.65, 0.5]; // P/L, ROE, DY
  const points = [0, 1, 2].map((i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    return {
      x: cx + Math.cos(angle) * r * scores[i],
      y: cy + Math.sin(angle) * r * scores[i],
    };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y} Z`).join(" ");
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          PETR4 · radar
        </span>
        <span className="num text-[11px] text-[#a78bfa]">3-eixos</span>
      </div>
      <svg viewBox="0 0 100 100" className="w-full">
        {/* Grid circles */}
        {[12, 24, 36].map((rr) => (
          <circle
            key={rr}
            cx={cx}
            cy={cy}
            r={rr}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
          />
        ))}
        {/* Axes */}
        {[0, 1, 2].map((i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * r}
              y2={cy + Math.sin(angle) * r}
              stroke="rgba(255,255,255,0.06)"
            />
          );
        })}
        {/* Filled radar */}
        <path
          d={path}
          fill="rgba(167,139,250,0.30)"
          stroke="#a78bfa"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Axis labels */}
        {["P/L", "ROE", "DY"].map((label, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
          return (
            <text
              key={label}
              x={cx + Math.cos(angle) * (r + 12)}
              y={cy + Math.sin(angle) * (r + 12)}
              fill="#9a9ba3"
              fontSize="6"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}