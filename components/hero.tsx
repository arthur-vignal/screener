"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { EncryptedText } from "@/components/ui/encrypted-text";
import { LiquidGlassHoverButton } from "@/components/ui/liquid-glass-hover-button";
import { LoginModal } from "@/components/login/login-modal";
import { WelcomeScreen } from "@/components/login/welcome-screen";

export function Hero() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  function handleSuccess(user: { username: string }) {
    setShowLogin(false);
    // tiny delay so the modal close animation lands first
    setTimeout(() => setUsername(user.username), 350);
  }

  return (
    <AuroraBackground>
      <div
        className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center"
        style={{
          filter: showLogin ? "blur(2px)" : "none",
          transition: "filter 400ms ease",
          pointerEvents: showLogin ? "none" : "auto",
        }}
      >
        <h1
          className="max-w-4xl text-balance text-white md:text-6xl lg:text-7xl xl:text-[96px]"
          style={{
            fontFamily: "var(--font-archivo-black), Manrope, sans-serif",
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.015em",
          }}
        >
          <EncryptedText
            text="Uma nova forma de analisar"
            revealDelayMs={15}
            flipDelayMs={18}
            startDelayMs={120}
            encryptedClassName="text-white/40"
            revealedClassName="text-white"
          />
          <br />
          <EncryptedText
            text="o mercado financeiro"
            revealDelayMs={15}
            flipDelayMs={18}
            startDelayMs={900}
            encryptedClassName="text-white/40"
            revealedClassName="text-white"
          />
        </h1>

        <p className="mt-6 max-w-md font-mono text-sm text-white/60 md:text-base">
          <EncryptedText
            text="feito por quem entende"
            revealDelayMs={20}
            flipDelayMs={20}
            startDelayMs={1500}
            encryptedClassName="text-white/30"
            revealedClassName="text-white/60"
          />
        </p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6, ease: "easeOut" }}
          className="mt-10"
        >
          <LiquidGlassHoverButton
            href="#"
            className="px-8 py-3.5 text-sm"
            onClick={(e) => {
              e.preventDefault();
              router.push("/login");
            }}
          >
            Acessar
          </LiquidGlassHoverButton>
        </motion.div>
      </div>

      <LoginModal
        open={showLogin}
        initialMode="signup"
        onClose={() => setShowLogin(false)}
        onSuccess={handleSuccess}
      />

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
    </AuroraBackground>
  );
}