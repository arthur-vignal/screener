"use client";

/**
 * HeaderOverlay - the floating greeting row that lives at the top
 * of the home page. It is NOT a sticky <header> element: the
 * component renders as a single absolutely positioned row, so the
 * entire page background shows through behind it. There is no
 * translucent band, no border, no backdrop-filter.
 *
 * Layout (matches the wireframe):
 *   left:  "Olá, <name>"
 *   right: clock + market status + theme toggle
 */

import { useEffect, useState } from "react";
import { Moon, Sun, Clock } from "lucide-react";
import { motion } from "motion/react";

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

export function HeaderOverlay() {
  const [clock, setClock] = useState(brTime());
  const [open, setOpen] = useState(isB3Open());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [name, setName] = useState<string>("");

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { user?: { username?: string } };
        if (!cancelled && data.user?.username) setName(data.user.username);
      } catch {
        // not logged in; keep default
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Clock className="h-3.5 w-3.5" />
        {clock}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: open ? "#4ade80" : "#f87171" }}
        />
        {open ? "Mercado aberto" : "Mercado fechado"}
      </span>
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="p-1.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
        aria-label="Alternar tema"
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function TypedName({ name }: { name: string }) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!name) {
      setTyped("");
      setDone(false);
      return;
    }
    setTyped("");
    setDone(false);
    const display = name.charAt(0).toUpperCase() + name.slice(1);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(display.slice(0, i));
      if (i >= display.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [name]);

  if (!name) return null;

  return (
    <span className="relative inline-block">
      <span
        className="font-medium tracking-tight"
        style={{
          backgroundImage:
            "linear-gradient(110deg, #e5e7eb 0%, #ffffff 35%, #c7d2fe 50%, #ffffff 65%, #e5e7eb 100%)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          animation: done
            ? "typed-shine 6s linear infinite"
            : "none",
        }}
      >
        {typed}
      </span>
      {!done && (
        <motion.span
          aria-hidden
          className="inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-foreground/80"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
        />
      )}
      <style jsx global>{`
        @keyframes typed-shine {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 300% 0%;
          }
        }
      `}</style>
    </span>
  );
}