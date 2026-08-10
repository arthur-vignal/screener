"use client";

/**
 * ScreenerPreview — visual mock of a fundamental screener result. 5
 * rows showing ticker / P/L / ROE / DY in a compact table.
 */
export function ScreenerPreview() {
  const rows = [
    { ticker: "PETR4", pl: "5.2", roe: "28.4%", dy: "12.5%" },
    { ticker: "VALE3", pl: "4.8", roe: "18.2%", dy: "9.8%" },
    { ticker: "ITUB4", pl: "7.1", roe: "20.1%", dy: "6.4%" },
    { ticker: "ABEV3", pl: "13.2", roe: "14.8%", dy: "5.5%" },
    { ticker: "WEGE3", pl: "26.4", roe: "22.0%", dy: "1.2%" },
  ];
  return (
    <div>
      <div
        className="grid grid-cols-[1fr_46px_50px_42px] py-1 text-[9px] uppercase tracking-[0.14em] text-[#65666e]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span>Ticker</span>
        <span className="text-right">P/L</span>
        <span className="text-right">ROE</span>
        <span className="text-right">DY</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.ticker}
          className="grid grid-cols-[1fr_46px_50px_42px] py-1.5 items-center"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <span className="num text-[10.5px] text-white font-medium">
            {r.ticker}
          </span>
          <span className="num text-[10.5px] text-[#34d399] text-right">
            {r.pl}
          </span>
          <span className="num text-[10.5px] text-white text-right">
            {r.roe}
          </span>
          <span className="num text-[10.5px] text-[#9a9ba3] text-right">
            {r.dy}
          </span>
        </div>
      ))}
    </div>
  );
}