"use client";

/**
 * MarketsTab — segunda aba do /analysis.
 *
 * Por enquanto placeholder. Vai ser desenvolvido em sprint futuro,
 * mas hoje a estrutura do /analysis já existe pra Macro tab.
 *
 * Padrão da sub-tab e subheader herda do analysis-tabs.tsx.
 */

import type { JSX } from "react";

export function MarketsTab(): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#101116] p-12 text-center">
      <p className="text-[14px] text-foreground">Em construção.</p>
      <p className="mt-2 text-[12px] text-muted-foreground/85">
        A aba "Mercados" será planejada depois com você — pode incluir
        tabelas de índices globais, sparklines, ou outras referências.
      </p>
    </div>
  );
}
