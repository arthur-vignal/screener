"use client";

/**
 * WelcomeScreen — full-bleed overlay shown right after a successful
 * signup/login. Background is a gray->black gradient with a heavy
 * blur layer over whatever is behind. The greeting
 *   "Bem vindo(a), {username}"
 * is rendered with a typewriter effect: "Bem vindo(a)" appears in
 * regular weight, then ", {username}" in bold. After a beat, the
 * whole line fades out, the backdrop-filter eases from 32px -> 0px
 * over ~0.9s, revealing the home underneath. The welcome unmounts
 * when the blur reaches 0, and onDone fires (which navigates to /home).
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function WelcomeScreen({
  username,
  onDone,
}: {
  username: string;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "exit">("typing");
  const prefix = "Bem vindo(a), ";
  const totalText = `${prefix}${username}`;

  // Typewriter
  useEffect(() => {
    if (phase !== "typing") return;
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
  }, [phase, totalText]);

  // Hold for 1.2s, then start exit
  useEffect(() => {
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("exit"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // When the exit animation ends, call onDone
  useEffect(() => {
    if (phase === "exit") {
      const t = setTimeout(() => onDone(), 950);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  const prefixDone = typed.length >= prefix.length;
  const restTyped = prefixDone ? typed.slice(prefix.length) : "";

  return (
    <AnimatePresence>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === "exit" ? 0 : 1,
          // The backdrop blur eases from 0 -> 36px while typing,
          // and from 36px -> 0 when the welcome screen exits. This
          // restores the underlying page (home) on exit.
          backdropFilter:
            phase === "exit" ? "blur(0px)" : "blur(36px)",
        }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: {
            duration: phase === "exit" ? 0.9 : 0.45,
            ease: "easeInOut",
          },
          backdropFilter: { duration: 0.9, ease: "easeInOut" },
        }}
        style={{
          WebkitBackdropFilter:
            phase === "exit" ? "blur(0px)" : "blur(36px)",
          transition: "WebkitBackdropFilter 0.9s easeInOut",
        }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      >
        {/* Gray->black gradient with a subtle moving light */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1f1f23 0%, #0a0a0c 60%, #18181b 100%)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)",
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