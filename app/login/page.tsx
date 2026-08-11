"use client";

/**
 * /login — dedicated auth page.
 *
 * Layout:
 *   - The page has its own dark, blurred background (no need for the
 *     landing-page hero). The backdrop gradient + blur is set on the
 *     <main> element so the LoginModal + WelcomeScreen both render
 *     over the same pre-blurred field.
 *   - When the user submits the password, the LoginModal animates
 *     out (fade + slide) and the WelcomeScreen types in on the
 *     same blurred field.
 *   - When the welcome line is done typing, after a short hold it
 *     fades out + the backdrop blur eases to 0, revealing the home.
 *
 * The "Voltar para o site" link uses router.push('/') so the user
 * can leave the page normally.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { LoginModal } from "@/components/login/login-modal";
import { WelcomeScreen } from "@/components/login/welcome-screen";

type Phase = "form" | "welcome" | "exit";

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [username, setUsername] = useState<string | null>(null);
  const [blur, setBlur] = useState(true);

  // Push a placeholder state on mount so the back button doesn't
  // take the user out of the app.
  useEffect(() => {
    window.history.pushState({ noback: true }, "");
    function onPop() {
      window.history.pushState({ noback: true }, "");
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // When the welcome screen reaches the exit phase we ease out the
  // backdrop-filter so the underlying home page becomes visible.
  useEffect(() => {
    if (phase === "exit") {
      // small delay so the welcome text starts fading first
      const t = setTimeout(() => setBlur(false), 350);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <main
      className="relative min-h-screen w-full text-foreground overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #1f1f23 0%, #0a0a0c 65%)",
        backdropFilter: blur ? "blur(0px)" : "blur(0px)",
        WebkitBackdropFilter: blur ? "blur(0px)" : "blur(0px)",
        transition: "backdrop-filter 0.9s easeInOut, -webkit-backdrop-filter 0.9s easeInOut",
      }}
    >
      {/* Pre-blur layer — a darker, slightly offset layer that
          reveals the home page underneath as it fades. We blur this
          layer on top of the page while the auth UI is shown. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(31,31,35,0.85) 0%, rgba(10,10,12,0.92) 65%)",
          backdropFilter: blur ? "blur(0px)" : "blur(0px)",
          WebkitBackdropFilter: blur ? "blur(0px)" : "blur(0px)",
          opacity: blur ? 1 : 0,
          transition: "opacity 0.9s easeInOut, backdrop-filter 0.9s easeInOut",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-5 left-6 right-6 z-10 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer text-[12px] text-white/55 hover:text-white transition-colors"
        >
          ← Voltar para o site
        </button>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Sulfur
        </span>
      </div>

      {/* Form (modal-style stepper) — visible while phase === 'form' */}
      <AnimatePresence>
        {phase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <LoginModal
              open={true}
              initialMode="signup"
              showGoogleOnlyOnFirstStage
              onClose={() => router.push("/")}
              onSuccess={(u) => {
                // small delay so the close animation lands first
                setTimeout(() => {
                  setUsername(u.username);
                  setPhase("welcome");
                }, 350);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome screen — same blurred field, types the greeting */}
      {username && (
        <WelcomeScreen
          username={username}
          onDone={() => {
            // After welcome exit, navigate to /home.
            if (typeof window !== "undefined") {
              window.location.href = "/home";
            }
          }}
        />
      )}

      {/* When welcome ends, fade out the grey overlay so the home
          underneath becomes visible. */}
      {/* (The WelcomeScreen handles its own fade-out and the blur
          transition. The <main>'s background just becomes visible.) */}
    </main>
  );
}