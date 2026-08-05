"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark-green" | "dark-mono";

const STORAGE_KEY = "sulfur:theme";

const ORDER: Theme[] = ["light", "dark-green", "dark-mono"];

function nextTheme(current: Theme): Theme {
  const idx = ORDER.indexOf(current);
  return ORDER[(idx + 1) % ORDER.length];
}

function themeIcon(theme: Theme) {
  if (theme === "light") return Sun;
  if (theme === "dark-green") return Moon;
  return Monitor;
}

function themeLabel(theme: Theme): string {
  if (theme === "light") return "Light";
  if (theme === "dark-green") return "Dark green";
  return "Dark mono";
}

/**
 * ThemeToggle — cycles through 3 themes on click.
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
    root.classList.remove("light", "dark-green", "dark-mono");
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, mounted]);

  // Inject inline script to apply theme before paint, avoiding flash.
  useEffect(() => {
    const script = document.createElement("script");
    script.innerHTML = `
      (function() {
        try {
          var t = localStorage.getItem('${STORAGE_KEY}');
          if (t === 'light' || t === 'dark-green' || t === 'dark-mono') {
            document.documentElement.classList.add(t);
          } else {
            document.documentElement.classList.add('light');
          }
        } catch (e) {
          document.documentElement.classList.add('light');
        }
      })();
    `;
    if (!document.getElementById("theme-init-script")) {
      script.id = "theme-init-script";
      document.head.appendChild(script);
    }
  }, []);

  const Icon = mounted ? themeIcon(theme) : Sun;

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
      <Icon className="w-4 h-4" />
    </button>
  );
}
