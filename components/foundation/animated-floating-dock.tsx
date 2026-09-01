"use client";

/**
 * AnimatedFloatingDock — dock inferior estilo aceternity (Floating Dock).
 *
 *   - Container: fixed bottom, centralizado, rounded-full (pill),
 *     bg-black/30 + backdrop-blur-md + border-white/10 (liquid glass).
 *   - Itens: 48x48px, ícones em círculos bg-neutral-800.
 *   - Hover: mouse-tracking scale (ícones próximos do cursor escalam
 *     mais que os distantes, efeito macOS dock). Tooltip com o label
 *     aparece ACIMA do ícone ao passar o mouse.
 *   - **Boot animation:** 1 ícone único no centro → expande pro
 *     dock completo via stagger reveal. Padrão da skill
 *     arthur-visual-style §6 (PageReveal sequence on /home mount).
 *   - Active: pill bg-white/[0.06] + stroke sutil.
 *
 * Inspirado no https://ui.aceternity.com/components/floating-dock.
 * ARTHUR pediu: "Substitui a dock por essa: ... liquid glass com
 * fundo semi-transparente. Adiciona animacao react avancada dessa
 * nova dock surgindo de apenas 1 icone".
 */

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
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

export function AnimatedFloatingDock({
  items = DEFAULT_ITEMS,
  className,
}: Props): JSX.Element {
  const pathname = usePathname() ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue<number | null>(null);

  // ── Boot animation ──────────────────────────────────────────────
  // `bootDone` libera a animação de reveal dos ícones. Antes disso,
  // todos colapsam em scale 0 / opacity 0 (efeito "1 ícone só").
  const [bootDone, setBootDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-50",
        "inline-flex items-center bg-black/30 backdrop-blur-md",
        "border border-white/10 rounded-2xl px-2 py-2",
        // liquid glass: ring + shadow pra flutuar
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.8)]",
        "ring-1 ring-inset ring-white/[0.04]",
        className,
      )}
      ref={containerRef}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) mouseX.set(e.clientX - rect.left);
      }}
      onMouseLeave={() => mouseX.set(null)}
    >
      {items.map((item, i) => (
        <DockIcon
          key={item.href}
          item={item}
          index={i}
          total={items.length}
          mouseX={mouseX}
          pathname={pathname}
          bootDone={bootDone}
        />
      ))}
    </nav>
  );
}

// ─── DockIcon (1 item) ────────────────────────────────────────────────────────

type DockIconProps = {
  item: DockItem;
  index: number;
  total: number;
  mouseX: ReturnType<typeof useMotionValue<number | null>>;
  pathname: string;
  bootDone: boolean;
};

function DockIcon({
  item,
  index,
  total,
  mouseX,
  pathname,
  bootDone,
}: DockIconProps): JSX.Element {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item.href);
  const ref = useRef<HTMLDivElement | null>(null);

  // Mouse-tracking scale (aceternity pattern): pega distância do
  // mouse até o centro do ícone, mapeia pra scale [1, 1.5].
  const distance = useTransform(mouseX, (mx) => {
    if (mx == null) return Infinity;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    const iconCenter = rect.left + rect.width / 2;
    // Calcula posição do centro do ícone RELATIVA ao container.
    // ref.current.offsetLeft dá a posição dentro do container.
    const localX = iconCenter - (ref.current?.parentElement?.getBoundingClientRect().left ?? 0);
    return Math.abs(mx - localX);
  });
  const scaleRaw = useTransform(distance, [0, 120], [1.5, 1]);
  const scale = useSpring(scaleRaw, { mass: 0.1, stiffness: 150, damping: 12 });

  // Boot: cada item com stagger + spring (i * 60ms).
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        bootDone
          ? { scale: 1, opacity: 1 }
          : { scale: 0, opacity: 0 }
      }
      transition={{
        type: "spring",
        mass: 0.4,
        stiffness: 200,
        damping: 18,
        delay: index * 0.06,
      }}
      style={{ scale }}
      className="relative"
    >
      <DockTooltip label={item.label}>
        <Link
          href={item.href}
          aria-label={item.label}
          title={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center justify-center h-12 w-12 rounded-full",
            "transition-colors duration-200 cursor-pointer",
            "origin-bottom",
            active
              ? "bg-white/[0.06] text-foreground ring-1 ring-inset ring-white/10"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon
            className="h-5 w-5"
            strokeWidth={active ? 2.25 : 2}
          />
        </Link>
      </DockTooltip>
    </motion.div>
  );
}

// ─── Tooltip flutuante (label no hover, padrão aceternity) ────────────────

function DockTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative"
    >
      {children}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.7 }}
        animate={
          hover
            ? { opacity: 1, y: -8, scale: 1 }
            : { opacity: 0, y: 10, scale: 0.7 }
        }
        transition={{ type: "spring", mass: 0.4, stiffness: 220, damping: 18 }}
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-foreground text-[11px] font-medium whitespace-nowrap pointer-events-none"
      >
        {label}
      </motion.div>
    </div>
  );
}

// ─── Variant antigo (sem animação) — preservado pra compat ──────────────────

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
        className,
      )}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-xl",
              "transition-colors duration-200 cursor-pointer",
              active
                ? "bg-white/[0.06] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            <Icon
              className="h-5 w-5"
              strokeWidth={active ? 2.25 : 2}
            />
          </Link>
        );
      })}
    </nav>
  );
}