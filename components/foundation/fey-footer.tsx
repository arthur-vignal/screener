"use client";

/**
 * FeyFooter — rodapé do template Fey (1:1 com print).
 *
 *   [logo Fey]                              curated by [logo Mobbin]
 *
 * Posicionado fixed no rodapé, fora do `w-[90%]` container, pra
 * sempre ficar nas bordas da tela (não segue a margem da home).
 */

import type { JSX } from "react";

export function FeyFooter(): JSX.Element {
  return (
    <footer
      className="fixed bottom-3 left-0 right-0 z-30 px-6 flex items-center justify-between text-[11px] text-muted-foreground/60 pointer-events-none"
      aria-label="Fey template footer"
    >
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Logo Fey — chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="font-semibold tracking-tight text-foreground/85">
          Fey
        </span>
      </div>
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <span>curated by</span>
        {/* Logo Mobbin — 2 squares stacked */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <rect x="3" y="3" width="10" height="10" rx="1.5" opacity="0.7" />
          <rect x="11" y="11" width="10" height="10" rx="1.5" />
        </svg>
        <span className="font-semibold tracking-tight text-foreground/85">
          Mobbin
        </span>
      </div>
    </footer>
  );
}
