"use client";

/**
 * AllStatsButton — botão "All X" canto superior direito de uma seção.
 *
 * Regras do design (DESIGN_RULES.md §4 — hierarquia de ação, §1 — radius):
 *   - radius-md (6px), bg-white/[0.04] + border-white/10
 *   - ícone Lucide + label
 *   - outline variant (não preenche, fica como secundário)
 *
 * Leva o usuário pra uma página Excel-style com todas as métricas
 * daquele tipo de estatística (financials/earnings/estimates).
 *
 * Props:
 *   href:    URL da página destino
 *   label:   texto visível (ex: "All financials", "All earnings")
 *   icon?:   ícone Lucide (default: ExternalLink)
 */

import Link from "next/link";
import { ExternalLink } from "lucide-react";

type Props = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function AllStatsButton({ href, label, icon: Icon = ExternalLink }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-white/[0.04] border border-white/10 text-[12.5px] text-foreground hover:bg-white/[0.08] hover:border-white/20 transition-colors focus:outline-none focus:border-white/20"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
