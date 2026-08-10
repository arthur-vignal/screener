"use client";

/**
 * FearGreedPreview — visual mock of the Fear & Greed gauge. Half-circle
 * gauge with a needle at ~63 (ganância).
 */
export function FearGreedPreview() {
  const cx = 50;
  const cy = 60;
  const r = 32;
  const value = 63;
  const angle = Math.PI - (value / 100) * Math.PI;
  const nx = cx + Math.cos(angle) * r;
  const ny = cy - Math.sin(angle) * r;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Fear & Greed
        </span>
        <span className="num text-[11px] text-[#34d399]">Ganância</span>
      </div>
      <svg viewBox="0 0 100 70" className="w-full">
        {/* Gauge arc */}
        <defs>
          <linearGradient id="fg-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f2555f" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          stroke="url(#fg-g)"
          strokeWidth="6"
          fill="none"
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#f5f5f7"
          strokeWidth="1.6"
        />
        <circle cx={cx} cy={cy} r="2" fill="#f5f5f7" />
        {/* Value */}
        <text
          x={cx}
          y={cy + 16}
          fill="#f5f5f7"
          fontSize="13"
          fontFamily="var(--font-display)"
          textAnchor="middle"
        >
          {value}
        </text>
      </svg>
    </div>
  );
}