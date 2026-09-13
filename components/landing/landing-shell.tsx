/**
 * LandingShell — wrapper da landing page.
 *
 * Estrutura:
 *   - bg #08090b (dark) + dot pattern sutil (::before pseudo)
 *   - sticky transparent header (vira black/60 ao scrollar)
 *   - 3 seções: Hero (#hero), Features (#features), Planos (#planos)
 *   - sem footer complexo — fim em Planos
 *
 * Padrão Arthur:
 *   - texto único botão Entrar → /login (regra explícita)
 *   - features e planos são links de navegação no header
 *   - sem emoji, sem gradientes animados, sem texto inventado
 */

import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingFeatures } from "./landing-features";
import { LandingPlanos } from "./landing-planos";

export function LandingShell() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#08090b] text-foreground antialiased">
      {/* dot pattern sutil — fundo de textura tipo Linear */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10">
        <LandingHeader />
        <main>
          <LandingHero />
          <LandingFeatures />
          <LandingPlanos />
        </main>
      </div>
    </div>
  );
}
