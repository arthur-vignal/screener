import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";

/**
 * Landing pública do Sulfur. Não exige auth.
 *
 * Estrutura mínima: header (Sulfur | Features | Planos | Login) + hero
 * (título + macbook-scroll com print real de /asset/PETR3). Sem seções
 * intermediárias — feedback "Hero + header. Mais nada."
 *
 * Body herda gradient metálico do globals.css (§35 sulfur-design-hardening).
 */
export default function LandingPage() {
  return (
    <main className="relative w-full text-foreground">
      <LandingNavbar />
      <LandingHero />
    </main>
  );
}
