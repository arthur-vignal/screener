"use client";

/**
 * LandingCTA — CTA final: chamada curta + botão login grande + assinatura.
 *
 * Texto sem emojis, mantendo o tom "laboratório" do print da Prisma.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

export function LandingCTA() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
      <h2
        className={cn(
          "font-display font-black tracking-[-0.02em] text-foreground",
          "text-balance text-[clamp(2rem,5vw,4rem)] leading-[1.05]",
        )}
      >
        Entre no laboratório.
      </h2>
      <p className="max-w-md text-pretty text-base text-muted-foreground lg:text-lg">
        Análise que cabe numa só tela, sem paywall de dados e sem ruído.
      </p>
      <Link
        href="/login"
        className={cn(
          "inline-flex items-center gap-3 rounded-full",
          "bg-foreground px-8 py-4",
          "text-base font-semibold tracking-tight text-background",
          "transition-opacity hover:opacity-90",
        )}
      >
        Entrar
        <span aria-hidden="true">→</span>
      </Link>
      <p className="mt-2 text-xs text-muted-foreground/70">
        Acesso gratuito durante o beta.
      </p>
    </div>
  );
}
