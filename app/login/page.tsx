"use client";

/**
 * /login — dedicated auth page.
 *
 * Replaces the modal-in-hero approach. Clicking 'Acessar' on the
 * landing page navigates here, so the back button takes the user
 * back to the landing page normally.
 *
 * The page uses the same stepper UI as before, but it sits on its
 * own dark background (no Aurora). The same WelcomeScreen fires
 * after a successful signup/login.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LoginModal } from "@/components/login/login-modal";
import { WelcomeScreen } from "@/components/login/welcome-screen";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  // Push a placeholder state on mount so the back button doesn't
  // take the user out of the app.
  useEffect(() => {
    window.history.pushState({ noback: true }, "");
    function onPop() {
      // Re-push so the back gesture is a no-op while logged in.
      window.history.pushState({ noback: true }, "");
    }
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return (
    <main
      className="relative min-h-screen w-full bg-bg text-foreground overflow-hidden"
      style={{ background: "radial-gradient(circle at 50% 0%, #18181b 0%, #0a0a0c 60%)" }}
    >
      {/* Top bar — minimal, just the brand and a "voltar" link */}
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

      {/* Page content — the stepper modal as a centred standalone UI */}
      <LoginModal
        open={true}
        initialMode="signup"
        showGoogleOnlyOnFirstStage
        onClose={() => router.push("/")}
        onSuccess={(u) => {
          // small delay so the close animation lands first
          setTimeout(() => setUsername(u.username), 350);
        }}
      />

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
    </main>
  );
}