"use client";

/**
 * AnimatedFloatingDock — dock inferior estilo aceternity.
 *
 *   - Container: fixed bottom, centralizado, rounded-full
 *     (pill), bg-black/30 + backdrop-blur-md (liquid glass).
 *   - Itens: 48x48px, ícones em círculos bg-neutral-800.
 *   - Hover: mouse-tracking scale (ícones próximos do cursor escalam
 *     mais que os distantes, efeito macOS dock).
 *   - **Boot animation:** mount começa com 1 ícone centralizado que
 *     expande (width + translate) até o dock completo. Stagger revela
 *     os ícones 1 por 1 com spring. Ver `bootProgress` abaixo.
 *   - Active: pill bg-white/[0.06] + stroke sutil.
 *
 * Inspirado no aceternity FloatingDock. ARTHUR pediu:
 *   - "Adiciona animacao react avancada dessa nova dock surgindo
 *     de apenas 1 icone, com estilo liquid glass com fundo
 *     semi-transparente"
 *
 * 6 ícones (Home, Analysis, Portfolio, News, Notifications, Search).
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

/**
 * Largura efetiva da dock em px por item (48px + 8px gap).
 * Calculada aqui pra usar no boot animation.
 */
const ITEM_WIDTH = 48;
const ITEM_GAP = 8;
function dockWidth(n: number): number {
  return n * ITEM_WIDTH + (n - 1) * ITEM_GAP;
}

export function AnimatedFloatingDock({
  items = DEFAULT_ITEMS,
  className,
}: Props): JSX.Element {
  const pathname = usePathname() ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseX = useMotionValue<number | null>(null);

  // ── Boot animation: dock aparece de 1 ícone. ─────────────────────
  // `bootDone` controla se os ícones estão visíveis. Começa false;
  // muda pra true após 600ms (depois do stagger inicial).
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
        "border border-white/10 rounded-full px-2.5 py-2.5",
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
  // motion value da posição X do mouse relativa ao container
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

  // Mouse-tracking scale: pega distância do mouse até o centro do
  // ícone e aplica scale inverso (aceternity). Ícones próximos do
  // cursor crescem até 1.5×, distantes voltam a 1×.
  const distance = useTransform(mouseX, (mx) => {
    if (mx == null) return Infinity;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    const iconCenter = rect.left + rect.width / 2;
    const containerLeft = rect.left - (ref.current?.offsetLeft ?? 0);
    return Math.abs(mx - (iconCenter - containerLeft));
  });
  // Scale range: 1 (longe) → 1.5 (perto do cursor).
  const scaleRaw = useTransform(distance, [0, 80], [1.5, 1]);
  const scale = useSpring(scaleRaw, { mass: 0.1, stiffness: 150, damping: 12 });

  // Boot: cada item aparece com stagger + spring.
  // Antes do boot: item collapsado em scale 0, opacity 0.
  // Quando bootDone=true: animate pra 1 com delay = i * 50ms.
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
      <Link
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-full",
          "transition-colors duration-200 cursor-pointer",
          // hover: ícone do meio escala + sobe
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
    </motion.div>
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

// Helper exportado — caso queira saber a largura total da dock
export { dockWidth };