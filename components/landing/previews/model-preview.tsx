"use client";

/**
 * ModelPreview — visual mock of the auto-populate CSV exporter.
 * Shows a small table of pulled metrics + a "Download CSV" CTA.
 */
export function ModelPreview() {
  const rows = [
    { metric: "Receita (bi)", value: "R$ 412" },
    { metric: "EPS TTM", value: "R$ 7.42" },
    { metric: "P/L", value: "5.4" },
    { metric: "ROE", value: "27.8%" },
    { metric: "EV/EBITDA", value: "4.2" },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="num text-[10.5px] uppercase tracking-[0.14em] text-[#65666e]">
          PETR4 snapshot
        </span>
        <span
          className="num text-[9.5px] px-1.5 py-0.5 rounded"
          style={{
            color: "#3fbfb0",
            background: "rgba(63,191,176,0.10)",
            border: "1px solid rgba(63,191,176,0.25)",
          }}
        >
          CSV ready
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.metric}
            className="flex items-center justify-between text-[10.5px]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="text-[#9a9ba3]">{r.metric}</span>
            <span className="num text-white">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}