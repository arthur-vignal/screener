"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Settings as SettingsIcon,
  HelpCircle,
  Gift,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Settings shell — sidebar fixa (200px) à esquerda + main scroll à
 * direita. 5 itens na sidebar: Account, Options, Support, Referrals
 * (4 principais) + Payment (extra, mesmo grupo, mesmo estilo).
 *
 * Header: título "Settings" à esquerda + email/Logout à direita.
 * Footer: marca Fey + tag "curated by Mobbin" (referência visual).
 *
 * Mobile (md:hidden): sidebar vira drawer controlado por estado
 * local (sem Sheet/shadcn — não há dependência instalada).
 */

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number | string }>;
};

const NAV: NavItem[] = [
  { href: "/settings/account", label: "Account", Icon: User },
  { href: "/settings/options", label: "Options", Icon: SettingsIcon },
  { href: "/settings/support", label: "Support", Icon: HelpCircle },
  { href: "/settings/referrals", label: "Referrals", Icon: Gift },
  { href: "/settings/payment", label: "Payment", Icon: CreditCard },
];

const MOCK_EMAIL = "user@sulfur.io";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="min-h-screen px-4 pt-20 pb-12 md:px-8">
      {/* Mobile top bar — só aparece < md */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08]"
          aria-label="Open settings menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-sm font-medium text-foreground">Settings</span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>

      <div className="mx-auto flex max-w-6xl gap-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-[200px] shrink-0 flex-col md:flex">
          <SidebarContent
            isActive={isActive}
            onNavigate={() => {}}
            showFooter
          />
        </aside>

        {/* Mobile drawer (overlay) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog">
            <button
              type="button"
              aria-label="Close menu backdrop"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="absolute left-0 top-0 h-full w-[260px] border-r border-white/10 bg-[#0e0f13] p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Settings
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarContent
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
                showFooter={false}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Desktop header */}
          <div className="mb-6 hidden items-center justify-between md:flex">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{MOCK_EMAIL}</span>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.08]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
  showFooter,
}: {
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  showFooter: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl fey-card p-3">
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon
                size={16}
                className={cn(
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {showFooter && (
        <div className="mt-auto flex items-end justify-between pt-6 text-xs text-muted-foreground">
          <span className="font-semibold tracking-tight text-foreground">
            Fey
          </span>
          <span className="opacity-60">curated by Mobbin</span>
        </div>
      )}
    </div>
  );
}
