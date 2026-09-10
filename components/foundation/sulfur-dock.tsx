"use client";

/**
 * SulfurDock — wrapper da dock oficial do Aceternity UI.
 *
 * Importa `FloatingDock` de `@/components/ui/floating-dock` (instalado
 * via `npx shadcn@latest add @aceternity/floating-dock-demo`).
 * Converte os DockItem do projeto pro formato aceito pelo aceternity:
 *   { title, icon: ReactNode, href }
 *
 * Liquid glass: bg-black/30 + backdrop-blur-md (mesma direção visual
 * da skill arthur-visual-style §"Background tint by ticker", mas
 * aplicada ao dock pill em vez do background da página).
 *
 * Posição: fixed bottom-5, centralizada. Mantida como aceternity —
 * o aceternity usa `mx-auto` (container relativo); a gente usa
 * `fixed` + `left-1/2 -translate-x-1/2` (igual ao DashboardDock legado).
 */

import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  LineChart,
  Newspaper,
  Search,
  UserCircle,
} from "lucide-react";
import type { JSX, ReactNode } from "react";

import { FloatingDock } from "@/components/ui/floating-dock";
import { cn } from "@/lib/utils";

export type SulfurDockItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

const ICONS = {
  home: Home,
  analysis: BarChart3,
  portfolio: LineChart,
  news: Newspaper,
  account: UserCircle,
  search: Search,
} as const;

const DEFAULT_ITEMS: SulfurDockItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/analysis", label: "Analysis", icon: "analysis" },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/account", label: "Account", icon: "account" },
  { href: "/search", label: "Search", icon: "search" },
];

type Props = {
  items?: SulfurDockItem[];
  className?: string;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Wrapper do aceternity FloatingDock. Converte items + aplica
 * posição fixa embaixo (aceternity é relativo ao container pai;
 * a gente quer `fixed bottom-5 left-1/2 -translate-x-1/2`).
 *
 * IMPORTANTE: a cor de background do aceternity é `bg-gray-50 dark:bg-neutral-900`.
 * A gente quer liquid glass com `bg-black/30 backdrop-blur-md border-white/10`.
 * Pra isso passamos via `desktopClassName` — mas o aceternity usa
 * `bg-gray-50 dark:bg-neutral-900` na classe raiz, e nossa custom
 * vai ser sobrescrita pelo `twMerge`. Pra garantir o override
 * usamos `!` no Tailwind (`!bg-black/30`).
 */
export function SulfurDock({
  items = DEFAULT_ITEMS,
  className,
}: Props): JSX.Element {
  const pathname = usePathname() ?? "";

  // Converte {label, icon: keyof} → {title, icon: ReactNode, href}.
  const acItems = items.map((it) => {
    const Icon = ICONS[it.icon];
    const active = isActive(pathname, it.href);
    return {
      title: it.label,
      href: it.href,
      icon: (
        <Icon
          // Cor do ícone: foreground quando ativo, muted caso contrário
          className={cn(
            "h-full w-full",
            active ? "text-foreground" : "text-neutral-400",
          )}
        />
      ),
    };
  });

  return (
    <div
      className={cn(
        // Posição fixa embaixo + centralizada
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-50",
        className,
      )}
    >
      <FloatingDock
        items={acItems}
        desktopClassName={cn(
          // Fey dock (2026-09-08 — sistema visual do Google Stitch):
          // liquid glass + inset rim-light + sombra externa grande.
          // Mantém `!` pra forçar override do bg-gray-50 default do
          // aceternity. Sombra é aplicada via classe .fey-dock no CSS.
          "!bg-black/30 backdrop-blur-md fey-dock",
        )}
        mobileClassName="!bg-black/30 backdrop-blur-md fey-dock"
      />
    </div>
  );
}

/**
 * Legacy export — alias do `SulfurDock`. Mantém compat com código
 * existente que importa `AnimatedFloatingDock`.
 */
export const AnimatedFloatingDock = SulfurDock;

/**
 * Item type do aceternity (re-export pra uso direto se precisar).
 */
export type AceternityDockItem = {
  title: string;
  icon: ReactNode;
  href: string;
};