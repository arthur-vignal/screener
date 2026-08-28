"use client";

/**
 * DashboardDock — dock de navegação inferior centralizado.
 *
 * Visual:
 *   - Container: rounded-2xl, bg-[#101116]/95, backdrop-blur, border-white/10
 *   - Itens: só ícone (sem texto embaixo), 48x48px
 *   - Hover: scale 1.15 + ícone sobe 4px (estilo macOS dock)
 *   - Ativo: pill sutil com bg-white/[0.06]
 *
 * 6 ícones máximo. Acesso ao resto via search/breadcrumb.
 *
 * Animação: cada item usa motion.div com whileHover scale + spring.
 */

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

import {
  BarChart3,
  Bell,
  Home,
  LineChart,
  Newspaper,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type DockItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

const ICONS = {
  home: Home,
  analysis: BarChart3,
  portfolio: LineChart,
  news: Newspaper,
  notifications: Bell,
  search: Search,
} as const;

const DEFAULT_ITEMS: DockItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/analysis", label: "Analysis", icon: "analysis" },
  { href: "/portfolio", label: "Portfolio", icon: "portfolio" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/search", label: "Search", icon: "search" },
];

type Props = {
  /** Custom items (default: 6 itens padrão). */
  items?: DockItem[];
  className?: string;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardDock({
  items = DEFAULT_ITEMS,
  className,
}: Props): JSX.Element {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-50",
        "inline-flex items-center gap-1 bg-[#101116]/95 backdrop-blur-md",
        "border border-white/10 rounded-2xl px-2.5 py-2",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.15, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="relative"
          >
            <Link
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl",
                "transition-colors duration-200 cursor-pointer",
                active
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
              )}
            >
              <Icon
                className="h-5 w-5"
                strokeWidth={active ? 2.25 : 2}
              />
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}
