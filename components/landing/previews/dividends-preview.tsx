"use client";

/**
 * DividendsPreview — visual mock of an upcoming-dividends calendar.
 * Lists 4 events with ex-date, ticker and per-share rate.
 */
export function DividendsPreview() {
  const events = [
    { date: "12 ago", ticker: "PETR4", rate: "R$ 1.45" },
    { date: "15 ago", ticker: "MXRF11", rate: "R$ 0.10" },
    { date: "20 ago", ticker: "VALE3", rate: "R$ 1.20" },
    { date: "28 ago", ticker: "ITUB4", rate: "R$ 0.55" },
  ];
  return (
    <div className="space-y-1">
      {events.map((e) => (
        <div
          key={e.ticker + e.date}
          className="flex items-center gap-2 py-1.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span className="num text-[9.5px] text-[#65666e] w-[58px] shrink-0">
            {e.date}
          </span>
          <span className="num text-[10.5px] text-white font-medium flex-1">
            {e.ticker}
          </span>
          <span className="num text-[10.5px] text-[#34d399] font-medium">
            {e.rate}
          </span>
        </div>
      ))}
    </div>
  );
}