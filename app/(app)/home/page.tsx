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
  { title: "Home", href: "/home", icon: <HomeIcon className="h-6 w-6" /> },
  { title: "Análise", href: "/analysis", icon: <BarChart3 className="h-6 w-6" /> },
  { title: "Calendário", href: "/calendar", icon: <Calendar className="h-6 w-6" /> },
  { title: "Portfólios", href: "/portfolios/public", icon: <Briefcase className="h-6 w-6" /> },
  { title: "Mensagens", href: "/messages", icon: <Mail className="h-6 w-6" /> },
  { title: "Alertas", href: "/alerts", icon: <Bell className="h-6 w-6" /> },
  { title: "Buscar", href: "/search", icon: <SearchIcon className="h-6 w-6" /> },
];

export default function HomePage() {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string>("");

  // Decide whether to show the welcome overlay. We use localStorage so
  // the welcome only appears once per day on this device. SSR can't
  // read localStorage, so we start with welcomeOpen=false and flip it
  // on inside this effect. The key embeds today's date so a new day
  // produces a fresh null and the welcome plays again.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const seen = window.localStorage.getItem(`home-welcome-seen:${today}`);
    if (!seen) {
      setWelcomeOpen(true);
    }
  }, []);

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
          onDone={() => {
            // Mark today as seen so the welcome doesn't replay until tomorrow.
            try {
              const today = new Date().toISOString().slice(0, 10);
              window.localStorage.setItem(`home-welcome-seen:${today}`, "1");
            } catch {
              // localStorage may be unavailable (e.g. private mode); fall
              // through to in-memory dismiss so the UI still clears.
            }
            setWelcomeOpen(false);
          }}
        />
      )}
      <div className="fixed bottom-[34px] left-6 z-40 pointer-events-auto">
        <HeaderOverlay />
      </div>
      <motion.main
            className="max-w-[1600px] mx-auto px-8 pt-5 pb-6 grid gap-6"
            style={{
              // Three columns, full viewport height. Left column is
              // narrower (1fr) and split between portfolio + day-highlight.
              // Middle is widest (2fr), right stays 1fr.
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)",
              gridTemplateRows: "1fr 1fr",
              height: "calc(100vh - 220px)",
              gridTemplateAreas: `
                "portfolio market news"
                "highlight  market news"
              `,
            }}
          >
        <div
          style={{ gridArea: "portfolio" }}
          className="min-h-0 h-full"
        >
          <PortfolioWidget />
        </div>
        <div
          style={{ gridArea: "market" }}
          className="min-h-0 h-full"
        >
          <MarketWidget />
        </div>
        <div
          style={{ gridArea: "news" }}
          className="min-h-0 h-full"
        >
          <NewsWidget />
        </div>
        <div
          style={{ gridArea: "highlight" }}
          className="min-h-0 h-full"
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