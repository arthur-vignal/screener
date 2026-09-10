"use client";

/**
 * RemoveHoldingDialog — confirma remoção de UMA holding específica.
 *
 * DELETE /api/portfolio/[slug]/holdings/[symbol] (sem body — symbol
 * vem no path).
 */

import { useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onRemoved: () => void;
  slug: string;
  symbol: string;
};

export function RemoveHoldingDialog({
  open, onClose, onRemoved, slug, symbol,
}: Props): JSX.Element | null {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function remove() {
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portfolio/${encodeURIComponent(slug)}/holdings/${encodeURIComponent(symbol)}`,
        { method: "DELETE" },
      );
      if (!res.ok && res.status !== 204) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      onRemoved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Remover ${symbol}`}
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
          Remover {symbol}?
        </h2>
        <p className="mt-2 text-[13px] text-muted-foreground/85 leading-snug">
          O ativo será removido do portfolio. O histórico de valorização
          registrado até aqui é preservado.
        </p>

        {error && (
          <p className="mt-3 text-[12px] text-[var(--negative)]">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={removing}
            className="h-8 px-3 rounded-md border border-white/10 bg-white/[0.04] text-[12px] font-medium text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="h-8 px-3 rounded-md bg-[var(--negative)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {removing ? "Removendo…" : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}
