"use client";

/**
 * OptionsPreview — visual mock of a long-call payoff curve. Shows the
 * kink at the strike with the loss region shaded.
 */
export function OptionsPreview() {
  const strike = 40;
  const premium = 1.5;
  const w = 280;
  const h = 56;
  const minS = strike * 0.7;
  const maxS = strike * 1.3;
  const rangeS = maxS - minS;
  const step = rangeS / 60;
  const points: Array<{ x: number; y: number }> = [];
  for (let s = minS; s <= maxS; s += step) {
    const x = ((s - minS) / rangeS) * w;
    const p = Math.max(0, s - strike) - premium;
    const yMax = strike * 0.3;
    const yMin = -premium - 1;
    const rangeP = yMax - yMin;
    const y = h - ((p - yMin) / rangeP) * (h - 4) - 2;
    points.push({ x, y });
  }
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  // Break-even line x
  const beX = ((strike + premium - minS) / rangeS) * w;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Long Call
        </span>
        <span className="num text-[11px] text-[#34d399]">Break-even</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full">
        <defs>
          <linearGradient id="opt-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* Loss zone */}
        <rect
          x={0}
          y={h - 5 - (premium + 1) / 4}
          width={beX}
          height={5 + (premium + 1) / 4}
          fill="rgba(242,85,95,0.10)"
        />
        {/* Strike line */}
        <line
          x1={beX}
          y1={0}
          x2={beX}
          y2={h}
          stroke="rgba(255,255,255,0.18)"
          strokeDasharray="2 4"
        />
        {/* Payoff line */}
        <path
          d={path}
          stroke="url(#opt-g)"
          strokeWidth="1.6"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between mt-1.5">
        <span className="num text-[8.5px] text-[#65666e]">K={strike}</span>
        <span className="num text-[8.5px] text-[#34d399]">
          BE={strike + premium}
        </span>
      </div>
    </div>
  );
}