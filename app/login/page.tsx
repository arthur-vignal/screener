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
import Image from "next/image";
import { LoginModal } from "@/components/login/login-modal";
import { WelcomeScreen } from "@/components/login/welcome-screen";

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

        {/* DIREITA — Logo + imagem full-bleed */}
        <div className="relative hidden lg:block overflow-hidden bg-black">
          {/* Imagem full-bleed — crop um pouco acima do centro pra
              mostrar mais céu (referência lavikatiyar) */}
          <Image
            src="/login-mountain.jpg"
            alt="Montanha nevada"
            fill
            priority
            quality={95}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            style={{ objectPosition: "center 35%" }}
          />

          {/* Logo Sulfur sobreposto */}
          <div className="absolute left-8 top-8 z-10">
            <span
              className="font-sans font-bold tracking-[-0.02em] text-[24px] lg:text-[26px]"
              style={{ color: "#f5e9d3" }}
            >
              Sulfur
            </span>
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
