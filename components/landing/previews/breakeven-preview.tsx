"use client";

/**
 * BreakevenPreview — visual mock of the breakeven IPCA spread. Two
 * stacked horizontal bars: nominal 5y vs realized IPCA 12m.
 */
export function BreakevenPreview() {
  const nominal = 14.5; // 5y nominal
  const realized = 5.17; // IPCA 12m
  const be = nominal - realized - 1.2; // implied breakeven (ex-real)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Breakeven 5y
        </span>
        <span className="num text-[11.5px] font-medium text-[#e8935b]">
          {be.toFixed(2)}% a.a.
        </span>
      </div>
      {/* Nominal bar */}
      <div className="space-y-1.5">
        <Bar
          label="Nominal 5y"
          value={nominal}
          max={16}
          color="#a78bfa"
        />
        <Bar
          label="IPCA realizado"
          value={realized}
          max={16}
          color="#3fbfb0"
        />
        <Bar
          label="Breakeven impl."
          value={be}
          max={16}
          color="#e8935b"
        />
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="num text-[10px] text-[#9a9ba3] w-[80px] shrink-0">
        {label}
      </span>
      <div
        className="h-[6px] rounded-full overflow-hidden flex-1"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span className="num text-[10.5px] text-white w-[40px] text-right">
        {value.toFixed(2)}%
      </span>
    </div>
  );
}