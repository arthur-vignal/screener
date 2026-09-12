"use client";

/**
 * LandingHero — hero da landing com animação de macbook-scroll (Aceternity).
 *
 * Estrutura vertical:
 *   - Título "Todas as informações que você precisa em um só lugar." acima
 *   - Componente <MacbookScroll /> com a tela do macbook mostrando um print
 *     da tela real do Sulfur (/laptop-screen@2x.jpg, 2560×1398, view
 *     /asset/PETR3 — gerado por scripts/upscale-laptop-screen.js).
 *
 * Comportamento:
 *   - max-w-4xl no wrapper centraliza e limita a largura do hero (não toma
 *     100% do viewport). Tela do macbook cabe confortável em 1280px+.
 *   - showGradient=false (sem gradiente na base — usuário pediu sem gradientes).
 *   - Sem badge (zero decoração).
 */

import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <section className={cn("relative w-full overflow-hidden")}>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-start pb-20 pt-6">
        <MacbookScroll
          title={
            <h1 className="text-balance text-center text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Todas as informações que você precisa em um só lugar.
            </h1>
          }
          src="/laptop-screen@2x.jpg"
          showGradient={false}
        />
      </div>
    </section>
  );
}
