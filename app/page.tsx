"use client";

import { useState } from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/landing/aurora-background";
import { LandingNav } from "@/components/landing/landing-nav";
import { BlurReveal } from "@/components/landing/blur-reveal";
import { CometCard } from "@/components/landing/comet-card";
import { LiquidGlassButton } from "@/components/landing/liquid-glass-button";
import { LoginModal } from "@/components/landing/login-modal";
import { WelcomeScreen } from "@/components/landing/welcome-screen";
import {
  LANDING_FEATURES,
  LANDING_STATS,
} from "@/lib/landing-tokens";

/**
 * Landing page (/) — first surface the visitor sees. New design:
 * aurora background, blur-reveal hero, 16-card comet grid, liquid-glass
 * CTAs, Fey-style login modal, encrypted welcome screen.
 *
 * State machine:
 *   - view = "landing"   → show landing
 *   - view = "login"     → show landing + login modal (click on any CTA)
 *   - view = "welcome"   → show encrypted welcome (after signup success)
 *   - view = "dashboard" → redirect to /?dashboard=br
 */
export default function LandingPage() {
  const [view, setView] = useState<
    "landing" | "login" | "welcome" | "dashboard"
  >("landing");
  const [loggedUsername, setLoggedUsername] = useState<string>("");

  function openLogin() {
    setView("login");
  }
  function closeLogin() {
    setView("landing");
  }
  function onSignupSuccess(username: string) {
    setLoggedUsername(username || "convidado");
    setView("welcome");
  }
  function continueToDashboard() {
    window.location.href = "/?dashboard=br";
  }

  return (
    <>
      <AuroraBackground />

      {/* Top nav */}
      <LandingNav onOpenLogin={openLogin} />

      {/* Main landing content */}
      {view !== "welcome" && (
        <main className="relative z-10 pt-14">
          {/* HERO */}
          <section
            id="home"
            className="relative px-6 pt-32 pb-24 max-w-[1100px] mx-auto text-center"
          >
            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#65666e] mb-6">
              v2.0 — agora com Brapi Pro
            </div>
            <h1 className="font-display text-[44px] md:text-[72px] leading-[1.05] tracking-[-0.04em] text-white">
              <BlurReveal as="span" delay={120}>
                Uma nova forma de analisar
              </BlurReveal>
              <br />
              <BlurReveal as="span" delay={420}>
                o mercado financeiro
              </BlurReveal>
            </h1>
            <BlurReveal
              as="p"
              delay={700}
              className="mt-6 font-mono text-[15px] text-[#9a9ba3] tracking-tight max-w-xl mx-auto"
            >
              Construído por quem entende.
            </BlurReveal>
            <div className="mt-10 flex items-center justify-center gap-3">
              <LiquidGlassButton onClick={openLogin} className="px-8 py-3.5">
                Acessar
              </LiquidGlassButton>
              <Link
                href="#features"
                className="text-[13px] text-[#9a9ba3] hover:text-white transition-colors press inline-flex items-center gap-1.5"
              >
                Ver features →
              </Link>
            </div>

            {/* Mini live sparkline — small IBOV-style preview to convey "live data". */}
            <MiniSparkline />
          </section>

          {/* STATS STRIP */}
          <section className="relative px-6 max-w-[1280px] mx-auto pb-16">
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {LANDING_STATS.map((s, i) => (
                <div
                  key={i}
                  className="px-5 py-5 text-center"
                  style={{
                    background: "#131316",
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#65666e]">
                    {s.label}
                  </div>
                  <div className="mt-1.5 font-display text-[24px] text-white">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURES GRID 4x4 */}
          <section
            id="features"
            className="relative px-6 max-w-[1280px] mx-auto pb-20"
          >
            <div className="text-center mb-10">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#65666e] mb-3">
                Tudo o que você precisa
              </div>
              <h2 className="font-display text-[36px] md:text-[44px] tracking-[-0.02em] text-white">
                Tudo em um lugar só.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LANDING_FEATURES.map((f) => (
                <CometCard
                  key={f.title}
                  title={f.title}
                  description={f.description}
                  accent={f.accent}
                />
              ))}
            </div>
          </section>

          {/* FINAL CTA + PREÇO */}
          <section
            id="preco"
            className="relative px-6 max-w-[1100px] mx-auto pb-32 pt-16 text-center"
          >
            <h2 className="font-display text-[36px] md:text-[44px] tracking-[-0.02em] text-white">
              Sem custo. Sem cadastro de cartão.
            </h2>
            <p className="mt-4 text-[14px] text-[#9a9ba3] max-w-xl mx-auto">
              A Sulfur é mantida por quem investe com ela. Os dados vêm de fontes
              públicas (B3, CVM, Brapi, FGV). Sem assinatura, sem limite de uso.
            </p>
            <div className="mt-8">
              <LiquidGlassButton onClick={openLogin} className="px-10 py-3.5 text-[15px]">
                Acessar
              </LiquidGlassButton>
            </div>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#65666e]">
              1.184 ativos · 503 S&P 500 · 4 índices B3
            </p>
          </section>

          {/* FOOTER */}
          <footer
            id="sobre"
            className="px-6 max-w-[1280px] mx-auto pb-12 pt-8 text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#65666e]">
              Sulfur.io · 2026 · Construído por quem entende
            </p>
          </footer>
        </main>
      )}

      <LoginModal
        open={view === "login"}
        onClose={closeLogin}
        onSuccess={onSignupSuccess}
      />

      {view === "welcome" && (
        <WelcomeScreen
          username={loggedUsername}
          onContinue={continueToDashboard}
        />
      )}
    </>
  );
}

/* Small inline sparkline shown in the hero — purely decorative; conveys
 * "live market data" without faking real numbers. */
function MiniSparkline() {
  // Sinusoidal walk with small noise to feel "market-like".
  const points = Array.from({ length: 80 }, (_, i) => {
    const t = i / 79;
    const v = 100 + Math.sin(t * 9) * 8 + Math.cos(t * 27) * 4 + (Math.random() - 0.5) * 2;
    return { x: t * 100, y: 50 - (v - 100) * 2.4 };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  return (
    <div
      className="mt-12 mx-auto h-[110px] max-w-[560px] rounded-lg overflow-hidden"
      style={{
        background: "rgba(19,19,22,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
      }}
    >
      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="miniLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#e8935b" />
            <stop offset="100%" stopColor="#3fbfb0" />
          </linearGradient>
        </defs>
        <path
          d={path}
          stroke="url(#miniLine)"
          strokeWidth="0.7"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
