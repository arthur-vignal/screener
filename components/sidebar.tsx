"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  PieChart,
  Bitcoin,
  Star,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/screen/stocks", label: "Ações", icon: TrendingUp },
  { href: "/screen/etfs", label: "ETFs", icon: PieChart },
  { href: "/screen/crypto", label: "Crypto", icon: Bitcoin },
  { href: "/search", label: "Buscar", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Star },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="px-6 py-5 border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-semibold text-foreground tracking-tight">Screener</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-elevated",
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-border-subtle">
        <p className="text-xs text-text-muted">
          powered by{" "}
          <a
            href="https://finnhub.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-foreground"
          >
            finnhub
          </a>
        </p>
      </div>
    </aside>
  );
}
