import { LandingShell } from "@/components/landing/landing-shell";

/**
 * Landing pública do Sulfur. Não exige auth.
 *
 * Estrutura (2026-09-12):
 *   - 3 seções: Hero (#hero), Features (#features), Planos (#planos)
 *   - Header sticky com nav pra âncoras + botão Login único
 *   - TODOS os CTAs encaminham /login (regra explícita do Arthur)
 *
 * Spec visual:
 *   - Bg #08090b + dot pattern sutil (Linear-style)
 *   - Roboto Slab nos headlines (alternando pesos)
 *   - Cream #f5e9d3 no texto principal (ting bege)
 *   - Prints reais da plataforma nos cards de Features
 *   - Sem emoji, sem gradientes animados, sem texto inventado
 */
export default function LandingPage() {
  return <LandingShell />;
}
