"use client";

/**
 * LandingHero — hero da landing com animação de macbook-scroll (Aceternity).
 *
 * Estrutura vertical:
 *   - Título "Todas as informações que você precisa em um só lugar." acima
 *   - Componente <MacbookScroll /> com a tela do macbook mostrando um print
 *     da tela real do Sulfur (/laptop-screen.jpg, 1280×699, view /asset/PETR3).
 *
 * O componente Aceternity (shadcn add @aceternity/macbook-scroll-demo) controla
 *   o scroll de página: o título aparece, depois conforme rola o macbook rotaciona
 *   de -25° (fechado) pra 0° (aberto) revelando a imagem da tela. O componente já
 *   reserva min-h-[200vh] pra scroll ter efeito.
 *
 * showGradient=false (sem gradiente na base — usuário pediu sem gradientes).
 * Sem badge (zero decoração).
 */

import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { cn } from "@/lib/utils";

export function LandingHero() {
  return (
    <section className={cn("relative w-full overflow-hidden")}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-start pb-20 pt-6">
        <MacbookScroll
          title={
            <h1 className="text-balance text-center text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Todas as informações que você precisa em um só lugar.
            </h1>
          }
          src="/laptop-screen.jpg"
          showGradient={false}
        />
      </div>
    </section>
  );
}
