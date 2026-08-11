"use client";

/**
 * SubHeader — minimal top bar that sits in the position of the
 * (now-removed) TopNav. Shows:
 *   - left: 'Olá, <name>' (or a default if not logged in)
 *   - right: Brasília clock + 'Mercado aberto/fechado' + dark/light
 *
 * Navigation is handled by the floating dock at the bottom of each
 * page, so this bar doesn't carry menu links.
 */

import { useEffect, useState } from "react";
import { Moon, Sun, Clock } from "lucide-react";

function brTime() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isB3Open(): boolean {
  const now = new Date();
  const brt = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const day = brt.getDay();
  const min = brt.getHours() * 60 + brt.getMinutes();
  if (day === 0 || day === 6) return false;
  return min >= 10 * 60 && min <= 17 * 60 + 30;
}

export function SubHeader({ name = "Convidado" }: { name?: string }) {
  const [clock, setClock] = useState(brTime());
  const [open, setOpen] = useState(isB3Open());
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const id = setInterval(() => {
      setClock(brTime());
      setOpen(isB3Open());
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="text-[14px] text-foreground">
          Olá,{" "}
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-4 text-[12.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {clock}
          </span>
          <span className="hidden sm:inline">
            O mercado está {open ? "aberto" : "fechado"}
          </span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-1 p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}