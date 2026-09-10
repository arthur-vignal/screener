"use client";

/**
 * HoldingActions — botões editar/remover em cada linha de holding.
 *
 * - Pencil: abre EditHoldingDialog (qty + avg_price + purchased_at).
 * - X: abre RemoveHoldingDialog (confirm + delete).
 *
 * Ambos visíveis só em hover (opacity-0 group-hover:opacity-100) pra
 * não poluir visualmente a lista de holdings.
 *
 * Após sucesso, chama onMutate() pra refresh do bundle do portfolio.
 */

import { Pencil, X } from "lucide-react";
import { useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

import { EditHoldingDialog, type EditHoldingInitial } from "./edit-holding-dialog";
import { RemoveHoldingDialog } from "./remove-holding-dialog";

type Props = {
  symbol: string;
  /** Slug do portfolio (pra URL da API). */
  slug: string;
  /** Valores iniciais do dialog de editar (do estado atual da holding). */
  initial: EditHoldingInitial;
  /** Callback após mutação bem-sucedida (SWR mutate do bundle). */
  onMutate: () => void;
};

export function HoldingActions({
  symbol, slug, initial, onMutate,
}: Props): JSX.Element {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditOpen(true);
          }}
          aria-label={`Editar ${symbol}`}
          title="Editar ativo"
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.06]",
            "transition-colors cursor-pointer",
          )}
        >
          <Pencil className="h-3 w-3" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRemoveOpen(true);
          }}
          aria-label={`Remover ${symbol}`}
          title="Remover ativo"
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted-foreground/70 hover:text-[var(--negative)] hover:bg-[var(--negative-soft)]",
            "transition-colors cursor-pointer",
          )}
        >
          <X className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </div>

      <EditHoldingDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={onMutate}
        slug={slug}
        symbol={symbol}
        initial={initial}
      />

      <RemoveHoldingDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onRemoved={onMutate}
        slug={slug}
        symbol={symbol}
      />
    </>
  );
}
