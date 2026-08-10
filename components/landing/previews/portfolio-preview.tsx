"use client";

/**
 * PortfolioPreview — visual mock of a portfolio summary. Total
 * invested, current value, performance bar, top holdings.
 */
export function PortfolioPreview() {
  const invested = 100000;
  const current = 112450;
  const perf = ((current - invested) / invested) * 100;
  const holdings = [
    { ticker: "PETR4", weight: 18 },
    { ticker: "VALE3", weight: 15 },
    { ticker: "ITUB4", weight: 12 },
    { ticker: "WEGE3", weight: 10 },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="num text-[11px] text-[#9a9ba3] uppercase tracking-wider">
          Meu portfólio
        </span>
        <span className="num text-[11px] text-[#34d399]">+{perf.toFixed(2)}%</span>
      </div>
      <div className="text-center my-2">
        <div className="num text-[22px] text-white">
          R$ {current.toLocaleString("pt-BR")}
        </div>
        <div className="num text-[9.5px] text-[#65666e] mt-0.5">
          vs R$ {invested.toLocaleString("pt-BR")} investido
        </div>
      </div>
      <div className="space-y-1">
        {holdings.map((h) => (
          <div
            key={h.ticker}
            className="flex items-center gap-2 text-[10.5px]"
          >
            <span className="num text-white w-12">{h.ticker}</span>
            <div
              className="h-1.5 rounded-full flex-1"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${h.weight * 4}%`, background: "#a78bfa" }}
              />
            </div>
            <span className="num text-[#9a9ba3] w-9 text-right">
              {h.weight}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}