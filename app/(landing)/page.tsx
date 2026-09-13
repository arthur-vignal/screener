import { LandingScroll } from "@/components/landing/landing-scroll";

/**
 * Landing pública do Sulfur. Não exige auth.
 *
 * Layout scroll-driven storytelling:
 *   - Background full-viewport fixed (ilha suspensa) com zoom conforme scroll
 *   - Seções sobrepostas em camadas:
 *       1. Hero (typing headline centralizado)
 *       2. Features (3 cards reais)
 *       3. CTA final + assinatura
 *
 * Body da página é bg-black pra não vazar o gradient metálico global.
 */
export default function LandingPage() {
  return (
    <main className="relative w-full bg-black text-foreground">
      <LandingScroll />
    </main>
  );
}
