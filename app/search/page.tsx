"use client";

import { useState, useMemo } from "react";
import { Search as SearchIcon } from "lucide-react";
import { cn, formatCompact, formatPercent } from "@/lib/utils";

type Row = {
  ticker: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  sector: string;
  industry: string;
  changePercent: number;
  yearHigh: number;
  yearLow: number;
  dividendYield: number | null;
  beta: number | null;
};

export default function SearchPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Filter state
  const [query, setQuery] = useState("");
  const [mcapMin, setMcapMin] = useState(0);
  const [mcapMax, setMcapMax] = useState(2_000_000);
  const [divYieldMin, setDivYieldMin] = useState(0);
  const [sectors, setSectors] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/screen/stocks?limit=100");
      const d = await r.json();
      setRows(d.rows);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query && !r.ticker.toLowerCase().includes(query.toLowerCase())) return false;
      if (r.marketCap < mcapMin) return false;
      if (r.marketCap > mcapMax) return false;
      if ((r.dividendYield ?? 0) < divYieldMin) return false;
      if (sectors.size > 0 && !sectors.has(r.industry)) return false;
      return true;
    });
  }, [rows, query, mcapMin, mcapMax, divYieldMin, sectors]);

  const allSectors = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.industry));
    return Array.from(s).sort();
  }, [rows]);

  const toggleSector = (s: string) => {
    setSectors((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  if (!loaded && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-1px)] px-8">
        <div className="text-center animate-fade-in max-w-md">
          <SearchIcon className="w-8 h-8 text-text-muted mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-medium text-foreground mb-2">Buscar</h2>
          <p className="text-text-secondary text-sm mb-6">
            Filtros estruturados pra encontrar ativos por mcap, dividend yield, setor.
          </p>
          <button
            onClick={load}
            className="bg-foreground text-background font-medium py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
          >
            Carregar dados
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Buscar</h1>
          <p className="text-sm text-text-secondary">
            {filtered.length} de {rows.length} ativos
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm text-text-secondary hover:text-foreground transition-colors disabled:opacity-30"
        >
          {loading ? "Atualizando..." : "Atualizar dados"}
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 mb-6 space-y-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por ticker..."
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-foreground/30"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Market cap mín: ${formatCompact(mcapMin)}M
            </label>
            <input
              type="range"
              min={0}
              max={2_000_000}
              step={10_000}
              value={mcapMin}
              onChange={(e) => setMcapMin(Number(e.target.value))}
              className="w-full accent-foreground"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Market cap máx: ${formatCompact(mcapMax)}M
            </label>
            <input
              type="range"
              min={0}
              max={2_000_000}
              step={10_000}
              value={mcapMax}
              onChange={(e) => setMcapMax(Number(e.target.value))}
              className="w-full accent-foreground"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Dividend yield mín: {divYieldMin.toFixed(1)}%
            </label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={divYieldMin}
              onChange={(e) => setDivYieldMin(Number(e.target.value))}
              className="w-full accent-foreground"
            />
          </div>
        </div>

        {allSectors.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-2">
              Setores ({sectors.size > 0 ? sectors.size + " selecionados" : "todos"})
            </label>
            <div className="flex flex-wrap gap-2">
              {allSectors.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSector(s)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-colors",
                    sectors.size === 0 || sectors.has(s)
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-text-secondary hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {s}
                </button>
              ))}
              {sectors.size > 0 && (
                <button
                  onClick={() => setSectors(new Set())}
                  className="px-3 py-1 text-xs rounded-full border border-border text-text-muted hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md shimmer" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">
            Nenhum resultado com esses filtros.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Ticker</th>
                <th className="text-left px-4 py-3 font-medium">Setor</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">Variação</th>
                <th className="text-right px-4 py-3 font-medium">Mcap</th>
                <th className="text-right px-4 py-3 font-medium">Yield</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.ticker}
                  onClick={() => (window.location.href = `/asset/${r.ticker}`)}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-surface-elevated transition-colors cursor-pointer",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-elevated/30",
                  )}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">
                    {r.ticker}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{r.industry}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    ${r.price.toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono tabular-nums",
                      r.changePercent >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatPercent(r.changePercent)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    ${formatCompact(r.marketCap * 1e6)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {r.dividendYield ? `${r.dividendYield.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
