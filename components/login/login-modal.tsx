"use client";

/**
 * LoginModal — Fey-style auth modal that fades in over a blurred
 * backdrop. The hero (or any page) blurs behind it via
 * backdrop-filter: blur(28px) on the wrapper overlay, while the
 * modal itself slides up + scales in.
 *
 * Modes:
 *   - "signup": full form (name + email + password) + Google button
 *   - "login": email + password + "forgot" link + Google button
 *
 * The modal talks to the existing /api/auth/{signup,login} routes
 * and to the Google OAuth flow (a NextAuth-style redirect to
 * /api/auth/google/start).
 */

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "signup" | "login";

export function LoginModal({
  open,
  initialMode = "signup",
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: (user: { username: string }) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body =
        mode === "signup"
          ? JSON.stringify({
              username: name || email.split("@")[0],
              email,
              password,
            })
          : JSON.stringify({ username: email, password });
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        user?: { username?: string };
      };
      if (!r.ok || !data.ok) {
        setError(data.error ?? "Falha ao autenticar");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onSuccess?.({
        username: data.user?.username ?? name ?? email.split("@")[0],
      });
    } catch (e) {
      setError("Erro de rede");
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    // Redirect to Google OAuth start endpoint
    window.location.href = "/api/auth/google/start";
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="login-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{
            background: "rgba(10, 10, 12, 0.55)",
            backdropFilter: "blur(28px) saturate(140%)",
            WebkitBackdropFilter: "blur(28px) saturate(140%)",
          }}
        >
          {/* Center radial halo (Fey touch) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 520,
              height: 520,
              background:
                "radial-gradient(circle, rgba(167,139,250,0.18) 0%, rgba(232,147,91,0.10) 35%, transparent 65%)",
              filter: "blur(20px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-2xl p-7"
            style={{
              background:
                "linear-gradient(180deg, rgba(26,26,30,0.78) 0%, rgba(19,19,22,0.85) 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {/* Top accent line */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(167,139,250,0.55), transparent)",
              }}
            />

            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <h2
                className="font-display text-[28px] tracking-tight leading-tight"
                style={{
                  background:
                    "linear-gradient(135deg, #fff 0%, #d8b4fe 50%, #fbcfe8 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {mode === "signup" ? "Welcome to Sulfur" : "Bem-vindo de volta"}
              </h2>
              <p className="mt-1.5 text-[13.5px] text-white/60">
                {mode === "signup"
                  ? "Para começar, crie sua conta."
                  : "Entre com seu email para continuar."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {mode === "signup" && (
                <LiquidInput
                  placeholder="Seu nome"
                  value={name}
                  onChange={setName}
                  type="text"
                  autoComplete="name"
                />
              )}
              <LiquidInput
                placeholder="Account email"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
                trailingArrow
              />
              <LiquidInput
                placeholder="Senha"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />

              {error && (
                <div className="text-[12px] text-[#f2555f] bg-[rgba(242,85,95,0.10)] border border-[rgba(242,85,95,0.26)] rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full text-[14px] font-semibold text-white transition-all duration-200 disabled:opacity-50 mt-2"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(16px) saturate(180%)",
                  WebkitBackdropFilter: "blur(16px) saturate(180%)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 20px rgba(0,0,0,0.25)",
                }}
              >
                {submitting
                  ? "..."
                  : mode === "signup"
                    ? "Criar conta"
                    : "Entrar"}
              </button>
            </form>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10.5px] text-white/40 tracking-wider">OU</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="mt-3 w-full h-12 rounded-full text-[14px] font-medium text-white inline-flex items-center justify-center gap-2.5 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(16px) saturate(180%)",
                WebkitBackdropFilter: "blur(16px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <GoogleG />
              Continuar com Google
            </button>

            <div className="mt-5 text-center text-[12px] text-white/50">
              {mode === "signup" ? (
                <>
                  Já tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-white hover:text-[#a78bfa] transition-colors"
                  >
                    Entrar
                  </button>
                </>
              ) : (
                <>
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-white hover:text-[#a78bfa] transition-colors"
                  >
                    Criar uma
                  </button>
                </>
              )}
            </div>

            <p className="mt-5 text-center text-[10.5px] text-white/30">
              Ao continuar, você concorda com nossos{" "}
              <a href="#" className="underline hover:text-white/60">
                Termos de Serviço
              </a>
              .
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---- LiquidInput: glassy pill with optional arrow icon ---- */
function LiquidInput({
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  trailingArrow = false,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  trailingArrow?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-4 h-12"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/40 outline-none"
      />
      {trailingArrow && (
        <button
          type="submit"
          aria-label="Enviar"
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---- Google "G" icon, simplified ---- */
function GoogleG() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.62 6.62 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}