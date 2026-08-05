"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Holding = { symbol: string; weight: number };

export default function NewPortfolioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [initialValue, setInitialValue] = useState(10000);
  const [createdAt, setCreatedAt] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setAuthed(true);
        else router.push("/login");
      })
      .catch(() => setAuthed(false));
  }, [router]);

  function addHolding() {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym || holdings.find((h) => h.symbol === sym)) return;
    // Auto-balance: distribute weight equally
    const newCount = holdings.length + 1;
    const equal = 1 / newCount;
    setHoldings([
      ...holdings.map((h) => ({ ...h, weight: equal })),
      { symbol: sym, weight: equal },
    ]);
    setNewSymbol("");
  }

  function removeHolding(sym: string) {
    const filtered = holdings.filter((h) => h.symbol !== sym);
    if (filtered.length === 0) {
      setHoldings([]);
      return;
    }
    const equal = 1 / filtered.length;
    setHoldings(filtered.map((h) => ({ ...h, weight: equal })));
  }

  function updateWeight(sym: string, w: number) {
    setHoldings(holdings.map((h) => (h.symbol === sym ? { ...h, weight: w } : h)));
  }

  const totalWeight = holdings.reduce((a, h) => a + h.weight, 0);
  const weightsValid = holdings.length > 0 && Math.abs(totalWeight - 1) < 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightsValid) {
      setError("weights devem somar 1.0");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const createdAtUnix = Math.floor(new Date(createdAt).getTime() / 1000);
      const r = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          initialValue,
          createdAt: createdAtUnix,
          holdings,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "erro ao criar");
        setLoading(false);
        return;
      }
      router.push(`/portfolios/${d.slug}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  if (authed === null) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href="/portfolios"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Novo portfolio
      </h1>
      <p className="text-sm text-body mb-6">
        Crie um portfolio manual. Pode usar data retroativa pra simular performance.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-hairline bg-surface p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-1.5">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Growth Tech 2025"
              className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm input-glow"
              required
              maxLength={60}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="estratégia, tese, observações…"
              className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm input-glow resize-none"
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-1.5">
                Valor inicial
              </label>
              <input
                type="number"
                value={initialValue}
                onChange={(e) => setInitialValue(Number(e.target.value))}
                min={1}
                className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm font-mono input-glow"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted font-medium block mb-1.5 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data de criação
              </label>
              <input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm font-mono input-glow"
              />
              <p className="text-[11px] text-muted mt-1">
                Retroativa simula performance desde essa data
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-foreground"
            />
            <span className="text-sm">Portfolio público (visível para outros)</span>
          </label>
        </div>

        {/* Holdings */}
        <div className="rounded-lg border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium">Ativos</h2>
            <span
              className={cn(
                "text-xs font-mono tabular-nums",
                weightsValid ? "text-positive" : "text-negative",
              )}
            >
              Total: {(totalWeight * 100).toFixed(1)}%
            </span>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHolding())}
              placeholder="ticker (ex: AAPL)"
              className="flex-1 bg-canvas-soft border border-hairline rounded-md px-3 py-2 text-sm font-mono input-glow"
            />
            <button
              type="button"
              onClick={addHolding}
              disabled={!newSymbol.trim()}
              className="px-3 py-2 text-sm rounded-md bg-ink text-canvas disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {holdings.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">
              Adicione pelo menos 1 ativo
            </p>
          ) : (
            <div className="space-y-1.5">
              {holdings.map((h) => (
                <div
                  key={h.symbol}
                  className="flex items-center gap-2 bg-background/50 rounded-md px-3 py-2"
                >
                  <span className="font-mono font-semibold text-sm w-20">
                    {h.symbol}
                  </span>
                  <input
                    type="number"
                    value={(h.weight * 100).toFixed(2)}
                    min={0}
                    max={100}
                    step={0.1}
                    onChange={(e) =>
                      updateWeight(h.symbol, Number(e.target.value) / 100)
                    }
                    className="flex-1 bg-transparent border border-hairline rounded px-2 py-1 text-sm font-mono tabular-nums text-right"
                  />
                  <span className="text-xs text-muted">%</span>
                  <button
                    type="button"
                    onClick={() => removeHolding(h.symbol)}
                    className="p-1 text-muted hover:text-negative"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-negative bg-negative-soft border border-negative/30 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/portfolios"
            className="px-4 py-2 text-sm rounded-md border border-hairline text-body hover:text-ink"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !weightsValid || !name.trim()}
            className="px-4 py-2 text-sm rounded-md bg-ink text-canvas disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar portfolio"}
          </button>
        </div>
      </form>
    </div>
  );
}
