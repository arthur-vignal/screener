"use client";

/**
 * EditHoldingDialog — editar qty, avg_price, purchased_at de uma holding.
 *
 * POST /api/portfolio/[slug]/holdings/[symbol] PATCH com os campos
 * alterados. Pelo menos 1 campo é obrigatório.
 *
 * Date picker usa input type="date" (YYYY-MM-DD). Converte pra unix
 * seconds UTC do meio-dia local BRT pra evitar off-by-one no fuso.
 */

import { useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

export type EditHoldingInitial = {
  qty: number;
  avgPrice: number;
  purchasedAt: number; // unix seconds UTC
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  slug: string;
  symbol: string;
  initial: EditHoldingInitial;
};

function dateInputToUnixSec(dateStr: string): number {
  // dateStr = "YYYY-MM-DD" do input type="date".
  // Converte pra unix seconds UTC do meio-dia BRT (15:00 UTC).
  // Evita que "10/09" seja interpretado como 9 ou 10 dependendo do fuso.
  if (!dateStr) return NaN;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  const date = new Date(Date.UTC(y, m - 1, d, 15, 0, 0));
  return Math.floor(date.getTime() / 1000);
}

function unixSecToDateInput(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  // Renderiza como YYYY-MM-DD em BRT (não UTC) pra alinhar com o picker.
  const brt = new Date(d.getTime() - 3 * 3600 * 1000);
  const y = brt.getUTCFullYear();
  const m = String(brt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(brt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function EditHoldingDialog({
  open, onClose, onSaved, slug, symbol, initial,
}: Props): JSX.Element | null {
  const [qty, setQty] = useState(String(initial.qty));
  const [avgPrice, setAvgPrice] = useState(
    initial.avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
  );
  const [dateStr, setDateStr] = useState(unixSecToDateInput(initial.purchasedAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, number> = {};
      const parsedQty = Number(qty.replace(",", "."));
      const parsedAvg = Number(avgPrice.replace(/\./g, "").replace(",", "."));
      const parsedDate = dateInputToUnixSec(dateStr);

      if (Number.isFinite(parsedQty) && parsedQty !== initial.qty) {
        body.qty = parsedQty;
      }
      if (Number.isFinite(parsedAvg) && Math.abs(parsedAvg - initial.avgPrice) > 0.0001) {
        body.avg_price = parsedAvg;
      }
      if (Number.isFinite(parsedDate) && parsedDate !== initial.purchasedAt) {
        body.purchased_at = parsedDate;
      }

      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(
        `/api/portfolio/${encodeURIComponent(slug)}/holdings/${encodeURIComponent(symbol)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar ${symbol}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border border-white/10 bg-[#15151a] p-5 shadow-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-[16px] font-semibold text-foreground tracking-tight">
          Editar {symbol}
        </h2>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] text-muted-foreground/85 font-medium uppercase tracking-wide">
              Quantidade
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-foreground tabular-nums focus:border-white/20 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground/85 font-medium uppercase tracking-wide">
              Preço médio (R$)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-foreground tabular-nums focus:border-white/20 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-muted-foreground/85 font-medium uppercase tracking-wide">
              Data de compra
            </span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[13px] text-foreground tabular-nums focus:border-white/20 focus:outline-none [color-scheme:dark]"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 text-[12px] text-[var(--negative)]">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-8 px-3 rounded-md border border-white/10 bg-white/[0.04] text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-8 px-3 rounded-md bg-[var(--primary)] text-[#070709] text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
