"use client";

/**
 * DashboardDock — dock de navegação inferior centralizado.
 *
 * Padrão visual (sulfur-ui-rules §3.3):
 *   Container: fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#101116]/95
 *              backdrop-blur border border-white/10 rounded-2xl
 *   Item:      flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md
 *              text-muted-foreground
 *   Ativo:     bg-white/[0.04] text-foreground
 *
 * 6 ícones máximo (limitação visual). Acesso ao resto é por
 * search global + breadcrumb.
 */

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
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "inline-flex items-center gap-0.5 bg-[#101116]/95 backdrop-blur-md",
        "border border-white/10 rounded-2xl px-2 py-1.5",
        "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[64px]",
              active
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
            <span className="text-[10px] font-medium leading-none">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
