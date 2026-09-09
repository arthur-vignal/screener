"use client";

/**
 * LandingCtaFooter — CTA final + footer simples.
 *
 * CTA final: background `.fey-card` com manifesto curto + botão primário.
 * Footer: 3 colunas (Produto / Recursos / Empresa) + linha de copyright.
 *
 * Decisão:
 * - Footer NÃO é sticky (§Ashmore §Composite ion §sem footer fixo na home)
 * - Espaçamento entre seções: py-20 lg:py-28
 * - Texto 100% branco (§13.1)
 * - Tudo dentro de max-w-[1280px] como nas outras seções
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

type FooterLink = { label: string; href: string; external?: boolean };

const COLS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Produto",
    links: [
      { label: "Carteiras", href: "/portfolio" },
      { label: "Valuation", href: "/asset/PETR4" },
      { label: "Calendar", href: "/portfolio" },
      { label: "Mercados", href: "/analysis" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Análise macro", href: "/analysis?tab=macro" },
      { label: "API brapi", href: "https://brapi.dev/docs", external: true },
      { label: "Glossário", href: "/asset/PETR4" },
      { label: "Status", href: "/api/health", external: true },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre", href: "#" },
      { label: "Termos de uso", href: "#" },
      { label: "Privacidade", href: "#" },
      { label: "Contato", href: "#" },
    ],
  },
];

export function LandingCtaFooter() {
  return (
    <>
      {/* CTA final */}
      <section id="planos" className="px-6 lg:px-12 pb-20 lg:pb-28">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="rounded-2xl fey-card overflow-hidden p-10 lg:p-16 flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-[36px] lg:text-[48px] font-semibold tracking-tight leading-[1.1] text-foreground">
                Pronto pra investir com método?
              </h2>
              <p className="mt-4 text-[14px] text-muted-foreground/70 max-w-md leading-relaxed">
                Crie sua conta, monte sua primeira carteira em 5 minutos.
                Sem cartão, sem cobrança.
              </p>
            </div>
            <a
              href="/signup"
              className={cn(
                "inline-flex items-center h-12 px-6 rounded-md",
                "bg-foreground text-background",
                "text-[15px] font-semibold tracking-tight",
                "hover:opacity-90 transition-opacity shrink-0",
              )}
            >
              Criar conta gratuita
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-10 border-t border-white/[0.06]">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 lg:gap-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] border border-white/10"
                >
                  <span
                    className="block h-3 w-3 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #489ffa 0%, #1d4ed8 70%, transparent 100%)",
                    }}
                  />
                </span>
                <span className="text-foreground font-semibold tracking-[0.18em] text-[13px] uppercase">
                  Sulfur
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground/70 max-w-xs leading-relaxed">
                Análise fundamental do mercado brasileiro. Curado no Brasil.
              </p>
            </div>
            {COLS.map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-foreground/70 mb-3">
                  {col.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-muted-foreground/85 hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[13px] text-muted-foreground/85 hover:text-foreground transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/60">
              Sulfur © 2026 · Dados de mercado aberto · Sem promessa de
              rentabilidade.
            </p>
            <p className="text-[11px] text-muted-foreground/60 tabular-nums">
              v0 · build {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
