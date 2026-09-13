"use client";

/**
 * LandingHeadline — frase central do hero (estática).
 *
 * Spec (2026-09-12):
 *   - Tipografia: Roboto Slab (serif slab, caloroso). Via `--font-roboto-slab`
 *     exposto em `app/layout.tsx`. Aplicada com `style={{ fontFamily: 'var(--font-roboto-slab)' }}`
 *     pra não conflitar com `--font-display` (que resolve pra Manrope no projeto).
 *   - Ting bege: `#f5e9d3` (cream/warm) com opacidade total. Não aplicar em
 *     features/CTA — só no headline, decisão visual do Arthur.
 *   - Sem typing effect: frase renderiza inteira. Sem cursor. Decisão do Arthur.
 */

import { cn } from "@/lib/utils";

const PHRASE = "Todas as informações que você precisa em um só lugar.";

// Cream warm — leve ting bege sobre texto claro no hero dark
const HEADLINE_COLOR = "#f5e9d3";

export function LandingHeadline() {
  return (
    <h1
      className={cn(
        "text-center whitespace-nowrap",
        "font-medium leading-[1.1] tracking-[-0.02em]",
        "text-[clamp(2rem,5.5vw,4.5rem)]",
      )}
      style={{
        fontFamily: "var(--font-roboto-slab)",
        color: HEADLINE_COLOR,
      }}
    >
      {PHRASE}
    </h1>
  );
}
