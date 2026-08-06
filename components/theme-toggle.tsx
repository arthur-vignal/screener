"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Leaf, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark-green" | "dark-green-mix" | "graphite" | "dark-mono";

const STORAGE_KEY = "sulfur:theme";

const ORDER: Theme[] = ["light", "dark-green", "dark-green-mix", "graphite", "dark-mono"];

function nextTheme(current: Theme): Theme {
  const idx = ORDER.indexOf(current);
  return ORDER[(idx + 1) % ORDER.length];
}

function themeLabel(theme: Theme): string {
  if (theme === "light") return "Light";
  if (theme === "dark-green") return "Tech sustain";
  if (theme === "dark-green-mix") return "Forest mix";
  if (theme === "graphite") return "Graphite";
  return "Dark mono";
}

/**
 * ThemeToggle — cycles through 5 themes on click.
 * Order: Light → Tech Sustain → Forest Mix → Graphite → Dark Mono → Light
 * Theme is persisted to localStorage and applied to <html> via class.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ORDER.includes(stored)) {
        setTheme(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark-green", "dark-green-mix", "graphite", "dark-mono");
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, mounted]);

  // Inject inline script to apply theme before paint, avoiding flash.
  useEffect(() => {
    if (document.getElementById("theme-init-script")) return;
    const script = document.createElement("script");
    script.id = "theme-init-script";
    script.innerHTML =
      "(function(){try{var t=localStorage.getItem('sulfur:theme');" +
      "var v=['light','dark-green','dark-green-mix','graphite','dark-mono'];" +
      "if(v.indexOf(t)>=0){document.documentElement.classList.add(t);}" +
      "else{document.documentElement.classList.add('light');}" +
      "}catch(e){document.documentElement.classList.add('light');}})();";
    document.head.appendChild(script);
  }, []);

  const iconClass = "w-4 h-4";

  return (
    <button
      onClick={() => setTheme(nextTheme(theme))}
      aria-label={`Switch theme (current: ${themeLabel(theme)})`}
      title={`Tema: ${themeLabel(theme)} — click pra próximo`}
      className={cn(
        "relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-surface-elevated transition-all duration-200 press",
        className,
      )}
    >
      {!mounted ? (
        <Sun className={iconClass} />
      ) : theme === "light" ? (
        <Sun className={iconClass} />
      ) : theme === "dark-green" ? (
        <Leaf className={iconClass} />
      ) : theme === "dark-green-mix" ? (
        <Trees className={iconClass} />
      ) : theme === "graphite" ? (
        <Moon className={iconClass} />
      ) : (
        <Monitor className={iconClass} />
      )}
    </button>
  );
}