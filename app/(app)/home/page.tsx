"use client";

/**
 * Home — authenticated dashboard (Sulfur).
 *
 * Layout (per the wireframe):
 *
 *   +----------------------------------------------------+
 *   | PORTFOLIO       | MERCADO B3        | NOTICIAS     |
 *   |                 |                   |              |
 *   | (table + spark) | (filter + table)  | (news feed)  |
 *   |                 |                   |              |
 *   | acessar →       |                   |              |
 *   +----------------+                   |              |
 *   | DATA DO DIA     |                   |              |
 *   | (top news card) |                   |              |
 *   +----------------------------------------------------+
 *
 * Top bar: SubHeader (Olá, <name> + clock + market status + theme).
 * Bottom: AnimatedFloatingDock.
 */

import { useState } from "react";
import { motion } from "motion/react";
import {
  Home as HomeIcon,
  BarChart3,
  Calendar,
  Briefcase,
  Mail,
  Bell,
  Search as SearchIcon,
} from "lucide-react";

import { AnimatedFloatingDock } from "@/components/ui/animated-floating-dock";
import { PortfolioWidget } from "@/components/home/portfolio-widget";
import { MarketWidget } from "@/components/home/market-widget";
import { NewsWidget } from "@/components/home/news-widget";
import { DayHighlight } from "@/components/home/day-highlight";

const DOCK_ITEMS = [
  { title: "Home", href: "/home", icon: <HomeIcon className="h-4 w-4" /> },
  { title: "Análise", href: "/analysis", icon: <BarChart3 className="h-4 w-4" /> },
  { title: "Calendário", href: "/calendar", icon: <Calendar className="h-4 w-4" /> },
  { title: "Portfólios", href: "/portfolios/public", icon: <Briefcase className="h-4 w-4" /> },
  { title: "Mensagens", href: "/messages", icon: <Mail className="h-4 w-4" /> },
  { title: "Alertas", href: "/alerts", icon: <Bell className="h-4 w-4" /> },
  { title: "Buscar", href: "/search", icon: <SearchIcon className="h-4 w-4" /> },
];

/* ---- Card wrapper that animates in with the existing stagger ---- */
function StaggerCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={
        "rounded-2xl border border-white/5 bg-card/40 backdrop-blur-sm overflow-hidden " +
        (className ?? "")
      }
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  // Mount state used to force-rebuild the home shell when the page
  // mounts after a navigation. Avoids stale renders.
  const [mounted] = useState(0);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      <motion.main
        key={`main-${mounted}`}
        className="max-w-[1400px] mx-auto px-6 pt-6 pb-32 grid gap-4"
        style={{
          gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1.3fr) minmax(0, 1fr)",
          gridTemplateRows: "auto auto",
          gridTemplateAreas: `
            "portfolio market  news"
            "highlight  market  news"
          `,
        }}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.16, delayChildren: 0.5 } },
        }}
      >
        <div style={{ gridArea: "portfolio" }} className="flex flex-col gap-4">
          <StaggerCard className="flex-1">
            <PortfolioWidget />
          </StaggerCard>
          <StaggerCard>
            <DayHighlight />
          </StaggerCard>
        </div>

        <div style={{ gridArea: "market" }}>
          <StaggerCard className="h-full">
            <MarketWidget />
          </StaggerCard>
        </div>

        <div style={{ gridArea: "news" }}>
          <StaggerCard className="h-full">
            <NewsWidget />
          </StaggerCard>
        </div>
      </motion.main>

      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatedFloatingDock items={DOCK_ITEMS} />
        </div>
      </div>

      <motion.footer
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5, ease: "easeOut" }}
        className="max-w-[1400px] mx-auto px-6 pb-8 pt-12 flex items-center justify-between text-xs text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-5 bg-foreground text-background flex items-center justify-center rounded">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path
                d="M3 17l5-5 4 4 7-8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Sulfur
        </span>
        <span>Sulfur.io · 2026</span>
      </motion.footer>
    </div>
  );
}