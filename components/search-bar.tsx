"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  symbol: string;
  name: string;
  type: "stock" | "etf" | "crypto" | "index";
  href: string;
};

/** Inline search bar — instant autocomplete grouped by type. */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside closes
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/assets/search?q=${encodeURIComponent(query)}`,
        );
        const d = (await r.json()) as { results: SearchResult[] };
        setResults(d.results ?? []);
        setActiveIdx(0);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Group by type
  const grouped = useMemo(() => {
    const map = new Map<SearchResult["type"], SearchResult[]>();
    for (const r of results) {
      const k = r.type;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries());
  }, [results]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      navigate(results[activeIdx].href);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 px-3 h-9 bg-surface border border-hairline rounded-md transition-all duration-200",
          open && "border-brand bg-surface-elevated shadow-[0_0_0_4px_var(--brand-soft)]",
        )}
      >
        <Search className="w-3.5 h-3.5 text-muted shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar ticker, ativo, crypto..."
          className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint outline-none min-w-0"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-0.5 text-muted hover:text-ink transition-colors press"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-hairline-strong rounded-md shadow-2xl overflow-hidden z-50 animate-slide-down max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted">Buscando...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted">
              Nenhum resultado para {JSON.stringify(query)}
            </div>
          )}
          {grouped.map(([type, items]) => (
            <div key={type} className="py-1">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted font-medium border-b border-hairline">
                {type === "stock" ? "Ações" : type === "etf" ? "ETFs" : type === "crypto" ? "Crypto" : "Índices"}
              </div>
              {items.map((r) => {
                const idx = results.indexOf(r);
                const active = idx === activeIdx;
                return (
                  <button
                    key={`${r.type}-${r.symbol}`}
                    onClick={() => navigate(r.href)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors duration-100",
                      active
                        ? "bg-brand-soft text-brand-deep"
                        : "text-ink hover:bg-surface-strong",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-medium text-sm">{r.symbol}</div>
                      <div className="text-xs text-muted truncate">{r.name}</div>
                    </div>
                    <span className="text-[10px] uppercase text-muted shrink-0">
                      {r.type}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
