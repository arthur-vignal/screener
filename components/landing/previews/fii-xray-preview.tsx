"use client";

/**
 * FiiXRayPreview — visual mock of FII distribution by class. Mini
 * stacked bar + 3 rows of representative tickers with their yield.
 */
export function FiiXRayPreview() {
  const distribution = [
    { class: "Tijolo", pct: 42, color: "#a78bfa" },
    { class: "Recebíveis", pct: 28, color: "#3fbfb0" },
    { class: "FOFs", pct: 18, color: "#e8935b" },
    { class: "Outros", pct: 12, color: "#c9c46a" },
  ];
  const sample = [
    { ticker: "HGLG11", cls: "Logística", dy: "9.1%" },
    { ticker: "MXRF11", cls: "Recebíveis", dy: "11.5%" },
    { ticker: "XPML11", cls: "Shoppings", dy: "9.4%" },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Classes
        </span>
        <span className="num text-[11px] text-[#a78bfa]">560+ FIIs</span>
      </div>
      {/* Stacked bar */}
      <div className="h-2 rounded-full overflow-hidden flex">
        {distribution.map((d) => (
          <div
            key={d.class}
            className="h-full"
            style={{ width: `${d.pct}%`, background: d.color }}
          />
        ))}
      </div>
      {/* Sample rows */}
      <div className="mt-3 space-y-1">
        {sample.map((s) => (
          <div
            key={s.ticker}
            className="flex items-center justify-between text-[10.5px]"
          >
            <span className="num text-white font-medium">{s.ticker}</span>
            <span className="text-[#65666e]">{s.cls}</span>
            <span className="num text-[#34d399]">{s.dy}</span>
          </div>
        ))}
      </div>
    </div>
  );
}