"use client";

/**
 * FeyDock — dock nativo do print Fey (centralizado embaixo).
 *
 * Diferente do `AnimatedFloatingDock` (que tem items genéricos:
 * home/portfolio/analysis/news/profile), o dock Fey tem items
 * específicos de watchlist + 1 item de "expand" à direita.
 *
 * Visual: 5 botões redondos centralizados, ~44px cada, com tooltip
 * no hover. Conforme print Fey:
 *
 *   [home] [charts] [watchlist] [news] [profile]   [expand]
 *
 * Quando o user tá em /portfolio/[slug], o item "watchlist" fica
 * ativo (fill branco off).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LineChart,
  Eye,
  Newspaper,
  User,
  Maximize2,
} from "lucide-react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
};

const ITEMS: Item[] = [
  { href: "/home", label: "Home", icon: Home, match: (p) => p.startsWith("/home") },
  { href: "/analysis", label: "Markets", icon: LineChart, match: (p) => p.startsWith("/analysis") },
  { href: "/portfolio", label: "Watchlist", icon: Eye, match: (p) => p.startsWith("/portfolio") },
  { href: "#", label: "News", icon: Newspaper },
  { href: "#", label: "Profile", icon: User },
];

export function FeyDock(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-2 py-2 rounded-2xl bg-[#0d0d11]/95 border border-white/10 backdrop-blur-md shadow-2xl shadow-black/40"
      aria-label="Navegação principal"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.match ? item.match(pathname) : false;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "group relative inline-flex items-center justify-center",
              "h-10 w-10 rounded-xl",
              "transition-colors duration-150",
              active
                ? "bg-white text-[#070709]"
                : "text-muted-foreground/85 hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        );
      })}
      {/* Separador + expand button à direita */}
      <div className="h-6 w-px bg-white/10 mx-1" />
      <button
        type="button"
        aria-label="Expandir"
        title="Expandir"
        className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground/85 hover:text-foreground hover:bg-white/[0.04] transition-colors"
      >
        <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </nav>
  );
}
