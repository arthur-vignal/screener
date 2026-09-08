"use client";

/**
 * DeletePortfolioDialog — modal de confirmação pra deletar portfolio.
 *
 * UX: o user precisa digitar o NOME EXATO do portfolio pra habilitar
 * o botão "Deletar". Isso previne deleção acidental.
 *
 * Após confirmar: chama onConfirm() e fica disabled até o pai resolver.
 * Erro 4xx/5xx é mostrado inline.
 */

import { useEffect, useState } from "react";
import type { JSX } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  portfolioName: string;
  holdingsCount: number;
};

export function DeletePortfolioDialog({
  open,
  onClose,
  onConfirm,
  portfolioName,
  holdingsCount,
}: Props): JSX.Element | null {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset estado toda vez que o modal abre.
  useEffect(() => {
    if (open) {
      setTyped("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  // Esc fecha o modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const matches = typed.trim() === portfolioName.trim() && portfolioName.length > 0;

  async function handleConfirm() {
    if (!matches || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-portfolio-title"
    >
      <div
        className="w-full max-w-md rounded-2xl fey-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(216,79,104,0.12)", color: "#d84f68" }}
              aria-hidden="true"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h2
                id="delete-portfolio-title"
                className="text-[15px] font-semibold tracking-tight text-foreground"
              >
                Deletar portfolio
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground/70">
                Esta ação é permanente e não pode ser desfeita.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-3">
          <p className="text-[13px] text-foreground/90 leading-relaxed">
            Você está prestes a deletar o portfolio{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{portfolioName}&rdquo;
            </span>{" "}
            {holdingsCount > 0 ? (
              <>
                e suas{" "}
                <span className="font-semibold text-foreground">
                  {holdingsCount} posições
                </span>{" "}
              </>
            ) : null}
            permanentemente. Todos os dados históricos serão removidos junto.
          </p>

          <label className="mt-4 block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 font-semibold">
              Digite{" "}
              <span className="text-foreground">{portfolioName}</span>{" "}
              para confirmar
            </span>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={submitting}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "mt-2 w-full h-9 rounded-md border bg-[#0c0d10] px-3 text-[13px] text-foreground outline-none transition-colors",
                matches
                  ? "border-[#d84f68]/50"
                  : "border-white/10 focus:border-white/30",
                submitting && "opacity-60 cursor-not-allowed",
              )}
            />
          </label>

          {error && (
            <p className="mt-3 text-[12px] text-[#d84f68]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-8 px-3 rounded-md text-[12px] font-medium text-foreground hover:bg-white/[0.04] transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!matches || submitting}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition-colors",
              matches && !submitting
                ? "bg-[#d84f68] text-white hover:bg-[#c84660]"
                : "bg-white/[0.04] text-muted-foreground/50 cursor-not-allowed",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            {submitting ? "Deletando…" : "Deletar"}
          </button>
        </div>
      </div>
    </div>
  );
}
