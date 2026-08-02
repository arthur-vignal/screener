"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

const UNIVERSES = [
  { value: "sp500", label: "S&P 500 (503 ações)" },
  { value: "stocks-broad", label: "Top 200 ações" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
] as const;

const RANKINGS = [
  { value: "momentum-12-1", label: "Momentum 12-1 (top performers)" },
  { value: "ytd", label: "YTD (year-to-date)" },
  { value: "value-low-pe", label: "Value (P/E baixo)" },
  { value: "quality-high-roe", label: "Quality (ROE alto)" },
  { value: "low-volatility", label: "Baixa volatilidade" },
] as const;

const SECTORS = [
  "Technology", "Health Care", "Financials", "Consumer Discretionary",
  "Communication Services", "Industrials", "Consumer Staples",
  "Energy", "Utilities", "Real Estate", "Materials",
] as const;

export default function NewIndexPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [universe, setUniverse] = useState<"sp500" | "stocks-broad" | "etf" | "crypto">("sp500");
  const [ranking, setRanking] = useState<typeof RANKINGS[number]["value"]>("momentum-12-1");
  const [topN, setTopN] = useState(30);
  const [sector, setSector] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [createdAt, setCreatedAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ symbol: string; name: string; rank: number }[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setAuthed(true);
        else router.push("/login");
      })
      .catch(() => setAuthed(false));
  }, [router]);

  async function loadPreview() {
    setPreviewLoading(true);
    try {
      const r = await fetch("/api/indices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universe, ranking, topN, filters: { sector: sector || undefined } }),
      });
      const d = await r.json();
      if (r.ok) setPreview(d.constituents ?? []);
      else setError(d.error ?? "erro no preview");
    } catch (err) {
      setError(String(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const createdAtUnix = Math.floor(new Date(createdAt).getTime() / 1000);
      const r = await fetch("/api/indices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          universe,
          ranking,
          topN,
          filters: { sector: sector || undefined },
          isPublic,
          createdAt: createdAtUnix,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "erro ao criar");
        setLoading(false);
        return;
      }
      router.push(`/indices/${d.slug}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  if (authed === null) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href="/indices"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">Novo índice</h1>
      <p className="text-sm text-text-secondary mb-6">
        Define universo + filtro + ranking. Calculamos constituintes e performance real.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Momentum Tech Q3"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
              required
              maxLength={60}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="metodologia, frequência de rebalanceamento, observações…"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30 resize-none"
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
                Universo
              </label>
              <select
                value={universe}
                onChange={(e) => setUniverse(e.target.value as typeof universe)}
                className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                {UNIVERSES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
                Setor (opcional)
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                <option value="">Todos</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
                Ranking
              </label>
              <select
                value={ranking}
                onChange={(e) => setRanking(e.target.value as typeof ranking)}
                className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
              >
                {RANKINGS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
                Top N
              </label>
              <input
                type="number"
                value={topN}
                onChange={(e) => setTopN(Math.max(1, Math.min(100, Number(e.target.value))))}
                min={1}
                max={100}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
              Data retroativa (opcional)
            </label>
            <input
              type="date"
              value={createdAt}
              onChange={(e) => setCreatedAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Calcula performance desde essa data até hoje
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-foreground"
            />
            <span className="text-sm">Índice público (visível para outros)</span>
          </label>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Preview de constituintes</h2>
            <button
              type="button"
              onClick={loadPreview}
              disabled={previewLoading}
              className="px-3 py-1 text-xs rounded-md bg-surface-elevated hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {previewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Calcular preview"}
            </button>
          </div>
          {preview ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
              {preview.slice(0, 30).map((c) => (
                <div
                  key={c.symbol}
                  className="bg-background/50 rounded px-2 py-1.5 text-xs font-mono"
                >
                  <span className="text-text-muted mr-1">#{c.rank}</span>
                  {c.symbol}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              Clique em &quot;Calcular preview&quot; pra ver os constituintes
            </p>
          )}
        </div>

        {error && (
          <div className="text-sm text-negative bg-negative/10 border border-negative/30 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/indices"
            className="px-4 py-2 text-sm rounded-md border border-border text-text-secondary hover:text-foreground"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm rounded-md bg-foreground text-background disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar índice"}
          </button>
        </div>
      </form>
    </div>
  );
}
