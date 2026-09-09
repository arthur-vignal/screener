import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHow } from "@/components/landing/landing-how";
import { LandingCtaFooter } from "@/components/landing/landing-cta-footer";

/**
 * Landing pública do Sulfur. Não exige auth.
 *
 * 4 seções verticais, todas dentro do mesmo wrapper com max-w-[1280px]:
 *  1. Hero (topbar + manifesto + CTAs + prova social + ilustração)
 *  2. Features (3 cards .fey-card com preview SVG inline)
 *  3. How (3 passos numerados, sem ícone)
 *  4. CTA final + footer (3 colunas)
 *
 * Body herda o gradient metálico do globals.css (§35 sulfur-design-hardening):
 *   #08090b base + radial top + linear 135deg diagonal.
 * Sem AuroraBackground (§8 sulfur-ui-rules: gradientes animados em loop proibidos).
 */
export default function LandingPage() {
  return (
    <main className="relative w-full text-foreground">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingHow />
      <LandingCtaFooter />
    </main>
  );
}
