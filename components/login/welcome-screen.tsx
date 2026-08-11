"use client";

/**
 * WelcomeScreen — full-bleed overlay shown right after a successful
 * signup/login. Background is a black -> gray gradient with a heavy
 * blur layer over whatever is behind. The greeting
 *   "Bem vindo(a), {username}"
 * is rendered with a typewriter effect: "Bem vindo(a)," appears in
 * regular weight, then ", {username}" in bold. After a beat, the
 * whole line fades out, the blur eases off, and the underlying home
 * page becomes visible.
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

  // Typewriter effect
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
    }, 38);
    return () => clearInterval(interval);
  }, [phase, totalText]);

  // Hold for 1.4s, then exit
  useEffect(() => {
    if (phase === "hold") {
      const t = setTimeout(() => setPhase("exit"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // After exit animation, fire onDone
  useEffect(() => {
    if (phase === "exit") {
      const t = setTimeout(() => onDone(), 750);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  // Split typed text into prefix and username
  const prefixDone = typed.length >= prefix.length;
  const restTyped = prefixDone ? typed.slice(prefix.length) : "";

  return (
    <AnimatePresence>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            // The backdrop blur eases from 0 -> 32px while we're typing,
            // and eases back to 0 when the welcome screen exits.
            backdropFilter: phase === "exit" ? "blur(0px)" : "blur(32px)",
          }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: phase === "exit" ? 0.6 : 0.4 },
            backdropFilter: { duration: 0.7 },
          }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #0a0a0c 0%, #18181b 50%, #0a0a0c 100%)",
          }}
        >
          {/* Subtle moving light */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="text-center max-w-2xl px-6">
            <div
              className="text-[28px] md:text-[40px] tracking-tight leading-[1.15] text-white"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              <span style={{ fontWeight: 400 }}>
                {prefixDone ? prefix : typed}
                {phase === "typing" && (
                  <span
                    aria-hidden
                    className="inline-block w-[2px] h-[1em] align-middle ml-1"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      animation: "welcome-blink 0.85s steps(2) infinite",
                    }}
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

          <style jsx global>{`
            @keyframes welcome-blink {
              0%,
              50% {
                opacity: 1;
              }
              50.01%,
              100% {
                opacity: 0;
              }
            }
          `}</style>
      </motion.div>
    </AnimatePresence>
  );
}