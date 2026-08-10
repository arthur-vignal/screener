"use client";

/**
 * CorrelationPreview — visual mock of a 6×6 correlation heatmap with
 * desaturated Fey colors.
 */
export function CorrelationPreview() {
  const symbols = ["PETR", "VALE", "ITUB", "ABEV", "WEGE", "BOVA"];
  // Modeled correlation matrix (clamped -1..1).
  const m = [
    [1, 0.6, 0.4, 0.2, 0.5, 0.8],
    [0.6, 1, 0.3, 0.1, 0.4, 0.7],
    [0.4, 0.3, 1, 0.5, 0.6, 0.5],
    [0.2, 0.1, 0.5, 1, 0.3, 0.4],
    [0.5, 0.4, 0.6, 0.3, 1, 0.6],
    [0.8, 0.7, 0.5, 0.4, 0.6, 1],
  ];
  function bg(v: number) {
    if (v >= 0) {
      const t = v;
      const r = Math.round(63 + (52 - 63) * t);
      const g = Math.round(64 + (211 - 64) * t);
      const b = Math.round(71 + (153 - 71) * t);
      return `rgb(${r},${g},${b})`;
    }
    const t = -v;
    const r = Math.round(63 + (242 - 63) * t);
    const g = Math.round(64 + (85 - 64) * t);
    const b = Math.round(71 + (95 - 71) * t);
    return `rgb(${r},${g},${b})`;
  }
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Pearson · 1Y
        </span>
        <span className="num text-[11px] text-[#a78bfa]">6×6</span>
      </div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `12px repeat(6, 1fr)` }}>
        <div />
        {symbols.map((s) => (
          <div
            key={s}
            className="num text-[8.5px] text-[#9a9ba3] text-center"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {s}
          </div>
        ))}
        {m.map((row, i) => (
          <>
            <div key={`l${i}`} className="num text-[8.5px] text-[#9a9ba3] text-right pr-1">
              {symbols[i]}
            </div>
            {row.map((v, j) => (
              <div
                key={`c${i}-${j}`}
                className="aspect-square rounded-[2px]"
                style={{ background: bg(v) }}
              />
            ))}
          </>
        ))}
      </div>
    </div>
  );
}