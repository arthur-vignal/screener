"use client";

/**
 * /login — split-screen auth (2026-09-13).
 *
 * Layout:
 *   - 2 colunas (50/50 em desktop, stack em mobile).
 *   - Esquerda: <LoginModal> (stepper de signup/login existente).
 *   - Direita: visual de promo (headline + bg image sutil + dots).
 *
 * A animação de welcome (typing → fade) continua funcionando —
 * o WelcomeScreen é overlay full-screen.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LoginModal } from "@/components/login/login-modal";
import { WelcomeScreen } from "@/components/login/welcome-screen";
import { cn } from "@/lib/utils";

type Phase = "form" | "welcome" | "exit";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [username, setUsername] = useState<string | null>(null);

  // Block back navigation
  useEffect(() => {
    window.history.pushState({ noback: true }, "");
    function onPop() {
      window.history.pushState({ noback: true }, "");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #1f1f23 0%, #0a0a0c 65%)",
      }}
    >
      {/* Top bar minimal — link "voltar" + logo */}
      <div className="absolute top-5 left-6 right-6 z-10 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer text-[12px] text-white/55 transition-colors hover:text-white"
        >
          ← Voltar
        </button>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Sulfur
        </span>
      </div>

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* ESQUERDA — Form (modal-style stepper) */}
        <div className="relative flex items-center justify-center px-6 py-20 lg:py-0">
          <AnimatePresence mode="wait">
            {phase === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md"
              >
                <LoginModal
                  open={true}
                  initialMode="signup"
                  showGoogleOnlyOnFirstStage
                  embedded
                  onClose={() => router.push("/")}
                  onSuccess={(u) => {
                    setUsername(u.username);
                    setPhase("welcome");
                    setTimeout(() => router.push("/home"), 1400);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DIREITA — Visual de promo */}
        <div
          className={cn(
            "relative hidden lg:flex lg:items-center lg:justify-center",
            "overflow-hidden px-12 py-16",
          )}
          style={{
            background:
              "linear-gradient(135deg, #0c0d10 0%, #15171c 50%, #08090b 100%)",
          }}
        >
          {/* dot pattern sutil */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.20]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.10) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Glow radial central */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 70% 30%, rgba(72,159,250,0.18) 0%, rgba(8,9,11,0) 50%)",
            }}
          />

          {/* Headline + sub */}
          <div className="relative z-10 flex max-w-md flex-col gap-6">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Sulfur · Mercado Brasileiro
            </span>
            <h2
              className="text-balance text-[clamp(2rem,3.5vw,2.75rem)] leading-[1.05] tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-roboto-slab)",
                color: "#f5e9d3",
              }}
            >
              <span className="block font-medium">Análise que</span>
              <span className="block font-black">cabe numa</span>
              <span className="block font-medium italic">só tela.</span>
            </h2>
            <p className="max-w-sm text-pretty text-base leading-relaxed text-muted-foreground">
              P/L, ROE, valuation bands do subsetor, forecast 6m
              calibrado e acompanhamento de carteira — sem paywall de
              dados e sem ruído.
            </p>

            {/* Stats em 3-col */}
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-6">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  781
                </span>
                <span className="text-xs text-muted-foreground">
                  Ações cobertas
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  63Q
                </span>
                <span className="text-xs text-muted-foreground">
                  Histórico fundamentalista
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  6m
                </span>
                <span className="text-xs text-muted-foreground">
                  Forecast quantitativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome screen (overlay) */}
      {username && (
        <WelcomeScreen
          username={username}
          onDone={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/home";
            }
          }}
        />
      )}
    </main>
  );
}
