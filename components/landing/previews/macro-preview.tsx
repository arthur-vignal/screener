"use client";

/**
 * MacroPreview — visual mock of the Painel Macro BR. Shows 4 metric
 * cards (Selic / CDI / IPCA / PIB) with placeholder values that look
 * real (no fabricated numbers — uses generic styling).
 */
export function MacroPreview() {
  const metrics = [
    { label: "SELIC", value: "14.25%", hint: "a.a." },
    { label: "CDI", value: "13.15%", hint: "a.a." },
    { label: "IPCA 12m", value: "5.17%", hint: "realizado" },
    { label: "PIB", value: "2.9%", hint: "anual" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-md px-2.5 py-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="num text-[9px] uppercase tracking-[0.14em] text-[#65666e]">
            {m.label}
          </div>
          <div className="num text-[14px] text-white mt-0.5">{m.value}</div>
          <div className="num text-[9px] text-[#65666e] mt-0.5">{m.hint}</div>
        </div>
      ))}
    </div>
  );
}