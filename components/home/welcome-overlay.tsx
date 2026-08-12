"use client";

/**
 * WelcomeOverlay - full-bleed dark overlay shown when the home
 * page mounts. Same typewriter pattern as the post-login welcome
 * screen, but here it fires on every /home visit (not just after
 * signup/login). The greeting types in over a gray->black gradient
 * with a subtle radial halo, then the overlay fades and the page
 * reveals underneath.
 *
 * Sequence:
 *   t=0       overlay mounts (opacity 0 -> 1, ~0.4s ease)
 *   t=0.4s    typewriter starts on "Bem vindo(a), <name>"
 *             "Bem vindo(a)," 400 weight, then ", <name>" 700
 *   done      hold 1.2s
 *   hold end  fade out (opacity 1 -> 0, ~0.7s) + onDone
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function WelcomeOverlay({
  username,
  onDone,
}: {
  username: string;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "exit">("typing");

  const prefix = "Bem vindo(a), ";
  const totalText = `${prefix}${username || "amigo"}`;

  useEffect(() => {
    if (phase !== "typing") return;
    // Wait for a real username before we begin typing. If the fetch
    // never resolves we bail to exit after 6s so the page is never
    // stuck behind the overlay.
    if (!username) {
      const bail = setTimeout(() => setPhase("exit"), 6000);
      return () => clearTimeout(bail);
    }
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTyped(totalText.slice(0, i));
      if (i >= totalText.length) {
        clearInterval(interval);
        setPhase("hold");
      }
    }, 42);
    return () => clearInterval(interval);
  }, [phase, totalText, username]);

  useEffect(() => {
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("exit"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "exit") {
      const t = setTimeout(() => onDone(), 700);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  const prefixDone = typed.length >= prefix.length;
  const restTyped = prefixDone ? typed.slice(prefix.length) : "";

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: phase === "exit" ? 0.7 : 0.4, ease: "easeInOut" },
        }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #1f1f23 0%, #0a0a0c 60%, #18181b 100%)",
        }}
      >
        {/* Radial halo */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)",
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative text-center max-w-2xl px-6">
          <div
            className="text-[22px] md:text-[28px] tracking-tight leading-[1.3] text-white"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            <span style={{ fontWeight: 400 }}>
              {prefixDone ? prefix : typed}
              {phase === "typing" && (
                <motion.span
                  aria-hidden
                  className="inline-block w-[2px] h-[1em] align-middle ml-1 bg-white"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
                />
              )}
            </span>
            {prefixDone && (
              <>
                <span style={{ fontWeight: 400 }}> </span>
                <span style={{ fontWeight: 700 }}>{restTyped}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}