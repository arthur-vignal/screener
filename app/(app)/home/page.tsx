"use client";

/**
 * Home — authenticated dashboard.
 *
 * Layout (per the wireframe):
 *   +----------------------+----------------------+-----------+
 *   | Portfolio card       | Mercado B3 card      | News card |
 *   | (Seu portfolio       | (filter + table)     | (vertical |
 *   |  valorizou hoje)     |                      |  feed)    |
 *   |                      |                      |           |
 *   |                      |                      |           |
 *   |                      |                      |           |
 *   |                      |                      |           |
 *   +----------------------+                      |           |
 *   | Data do dia card     |                      |           |
 *   | (Principal noticia)  |                      |           |
 *   +----------------------+----------------------+-----------+
 *
 * All four cards terminate at the same horizontal line.
 * SubHeader sits on top, AnimatedFloatingDock at the bottom.
 */

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

import { useEffect, useState } from "react";
import { AnimatedFloatingDock } from "@/components/ui/animated-floating-dock";
import { WelcomeOverlay } from "@/components/home/welcome-overlay";
import { HeaderOverlay } from "@/components/ui/header-overlay";
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

export default function HomePage() {
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [welcomeName, setWelcomeName] = useState<string>("");

  // Fetch the username once on mount so the welcome typewriter
  // has a name to type as soon as the overlay paints.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { user?: { username?: string } };
        if (!cancelled && data.user?.username) {
          setWelcomeName(data.user.username);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden"
      style={{
        fontFamily: "var(--font-manrope)",
        background:
          "linear-gradient(135deg, #0a0a0c 0%, #14151a 60%, #0a0a0c 100%)",
      }}
    >
      {welcomeOpen && (
        <WelcomeOverlay
          username={welcomeName}
          onDone={() => setWelcomeOpen(false)}
        />
      )}
      <div className="fixed bottom-[34px] left-6 z-40 pointer-events-auto">
        <HeaderOverlay />
      </div>
      <motion.main
            className="max-w-[1400px] mx-auto px-6 pt-6 pb-12 grid gap-6"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)",
              gridTemplateRows: "minmax(0, 405px) minmax(0, 405px)",
              height: "calc(100vh - 64px)",
              gridTemplateAreas: `
                "portfolio market news"
                "highlight  market news"
              `,
            }}
            // Don't orchestrate via parent variants — each widget
            // (PortfolioWidget / MarketWidget / NewsWidget /
            // DayHighlight) drives its own initial/animate so the cards
            // always paint their content. Without this, framer-motion's
            // stagger looked for 'hidden'/'show' variants on the children
            // and parked them at opacity:0 forever (only DayHighlight
            // declares matching variants, which is why it was the only
            // card showing data).
          >
        <div
          style={{ gridArea: "portfolio" }}
          className="min-h-0"
        >
          <PortfolioWidget />
        </div>
        <div
          style={{ gridArea: "market" }}
          className="min-h-0 row-span-2"
        >
          <MarketWidget />
        </div>
        <div
          style={{ gridArea: "news" }}
          className="min-h-0 row-span-2"
        >
          <NewsWidget />
        </div>
        <div
          style={{ gridArea: "highlight" }}
          className="min-h-0"
        >
          <DayHighlight />
        </div>
      </motion.main>

      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatedFloatingDock items={DOCK_ITEMS} />
        </div>
      </div>


    </div>
  );
}