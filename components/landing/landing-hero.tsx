"use client";

/**
 * LandingHero — hero full-viewport estilo Prisma (referência visual enviada).
 *
 * Layout (referência: print Prisma):
 *   ┌──────────────────────────────────────────────────────┐
 *   │ [background image full-screen, escura]                │
 *   │                                                       │
 *   │  Sulfur*                       Todas as informações  │
 *   │  (esquerda, gigante)          que você precisa em   │
 *   │                               um só lugar.          │
 *   │                               [Login]                │
 *   └──────────────────────────────────────────────────────┘
 *
 * Tipografia:
 *   - "Sulfur*" — Archivo Black (já carregado em app/layout.tsx),
 *     text-balance + viewport-fluid (clamp 4rem – 12rem), tracking-tight.
 *   - Descrição — Manrope (display do projeto).
 *   - Asterisco é sufixo da palavra gigante (mesmo padrão do print).
 *
 * Background:
 *   - public/landing-bg.png (4096×2288, ~3.7MB): ilha suspensa com céu
 *     escuro à esquerda e nuvens douradas à direita. Posicionada em
 *     `25% 50%` pra focar o céu escuro na viewport (texto fica em zona
 *     de alto contraste).
 *   - background-attachment fixed pra não rolar junto com a página.
 *   - Overlay duplo: vignette lateral-esquerda (escurece onde o texto fica)
 *     + bottom-fade (contraste geral). Compensa a zona dourada à direita.
 *
 * Responsivo:
 *   - ≥ lg: 2-coluna (Sulfur* | texto+CTA), alinhados no rodapé.
 *   - < lg: empilhado, Sulfur* menor.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden bg-black text-foreground">
      {/* Background image full-screen, deslocada pra esquerda */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url(/landing-bg.webp)",
          backgroundPosition: "25% 50%",
          backgroundAttachment: "fixed",
        }}
      />
      {/* Overlay duplo: vignette esquerda + bottom-fade */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(270deg, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 70%), " +
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1400px] flex-col px-6 pb-12 pt-32 lg:px-12 lg:pb-16 lg:pt-40">
        <div className="mt-auto flex w-full flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          {/* Coluna esquerda: palavra gigante */}
          <h1
            className={cn(
              "font-display font-black leading-[0.85] tracking-[-0.04em]",
              "text-balance text-[clamp(4rem,18vw,12rem)]",
              "text-foreground",
            )}
          >
            Sulfur
            <span className="text-[0.6em] align-top">*</span>
          </h1>

          {/* Coluna direita: descrição + CTA */}
          <div className="flex max-w-md flex-col gap-6 lg:max-w-sm">
            <p
              className={cn(
                "text-pretty text-base font-medium leading-snug text-foreground/90 lg:text-lg",
              )}
            >
              Todas as informações que você precisa em um só lugar.
            </p>
            <div>
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full",
                  "bg-foreground/95 px-6 py-3",
                  "text-sm font-semibold tracking-tight text-background",
                  "transition-opacity hover:opacity-90",
                )}
              >
                Login
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
