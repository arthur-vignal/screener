import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";

/**
 * Landing pública do Sulfur. Não exige auth.
 *
 * Layout:
 *   - Navbar absolute/transparent sobre o hero
 *   - Hero full-viewport estilo Prisma (Sulfur* gigante à esquerda +
 *     descrição + CTA à direita sobre background image)
 *   - Sem seções intermediárias.
 *
 * Body da página é bg-black pra não vazar o gradient metálico global
 * quando o hero é full-screen.
 */
export default function LandingPage() {
  return (
    <main className="relative w-full bg-black text-foreground">
      <LandingNavbar />
      <LandingHero />
    </main>
  );
}
