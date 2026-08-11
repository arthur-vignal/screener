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

export function SubHeader() {
  const [clock, setClock] = useState(brTime());
  const [open, setOpen] = useState(isB3Open());
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [name, setName] = useState<string>("");

  // Fetch current user (the cookie set by /api/auth/{signup,login} is
  // httpOnly, so we hit /api/auth/me to read it back as JSON).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { user?: { username?: string } };
        if (!cancelled && data.user?.username) setName(data.user.username);
      } catch {
        // not logged in; keep the default greeting
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <header
      className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-md"
      style={{ background: "rgba(0,0,0,0.30)" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="text-[14px] text-foreground">
          Olá,{" "}
          <TypedName name={name} />
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

/* ---- TypedName: typewriter effect on the username ---- */
function TypedName({ name }: { name: string }) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Wait until we actually have a real username from /api/auth/me.
    // Don't render anything (not even the greeting line) until then,
    // so the user never sees a flash of "Convidado".
    if (!name) {
      setTyped("");
      setDone(false);
      return;
    }
    setTyped("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(name.slice(0, i));
      if (i >= name.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [name]);

  // Don't render the greeting at all until the username has loaded.
  if (!name) return null;

  return (
    <span className="font-medium text-foreground">
      {typed}
      {!done && (
        <motion.span
          aria-hidden
          className="inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-foreground"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
        />
      )}
    </span>
  );
}
// rebuild trigger Tue, Aug 11, 2026  3:57:39 PM
