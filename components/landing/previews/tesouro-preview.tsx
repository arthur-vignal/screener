"use client";

/**
 * TesouroPreview — visual mock of the Tesouro Direto list. 4 rows
 * with title, rate and a mini bar indicating relative yield.
 */
export function TesouroPreview() {
  const titles = [
    { name: "Tesouro Prefixado 2029", rate: "13.85%", accent: "#a78bfa" },
    { name: "Tesouro IPCA+ 2035", rate: "6.05% + IPCA", accent: "#3fbfb0" },
    { name: "Tesouro Selic 2029", rate: "0.50% + Selic", accent: "#34d399" },
    { name: "Tesouro Prefixado 2045", rate: "14.20%", accent: "#e8935b" },
  ];
  return (
    <div className="space-y-1">
      {titles.map((t) => (
        <div
          key={t.name}
          className="flex items-center gap-2 py-1"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: t.accent }}
          />
          <span className="flex-1 text-[10.5px] text-white truncate">
            {t.name}
          </span>
          <span
            className="num text-[10px] font-medium"
            style={{ color: t.accent }}
          >
            {t.rate}
          </span>
        </div>
      ))}
    </div>
  );
}