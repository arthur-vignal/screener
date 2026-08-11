"use client";

/**
 * LoginModal (stepper) - one-field-at-a-time auth UI.
 *
 * Stages (signup):
 *   1. name     -> "Para comecar, digite seu nome"
 *   2. email    -> "Para comecar, digite seu email"   (back -> name)
 *   3. password -> "Para comecar, crie uma senha"      (back -> email)
 *
 * Back button is rendered above each field on stages 2 and 3.
 * Submit on the password stage fires the actual /api/auth/{signup,login}
 * request. While submitting, the arrow button shows a spinner.
 */

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, X } from "lucide-react";

type Mode = "signup" | "login";
type Stage = "name" | "email" | "password";

const STAGE_PROMPTS: Record<Stage, string> = {
  name: "Para comecar, digite seu nome",
  email: "Para comecar, digite seu email",
  password: "Para comecar, crie uma senha",
};

export function LoginModal({
  open,
  initialMode = "signup",
  onClose,
  onSuccess,
  showGoogleOnlyOnFirstStage = false,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSuccess?: (user: { username: string }) => void;
  showGoogleOnlyOnFirstStage?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [stage, setStage] = useState<Stage>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStage("name");
      setError(null);
    }
  }, [open]);

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

  function advance() {
    if (stage === "name" && name.trim().length > 0) {
      setStage("email");
    } else if (stage === "email" && email.includes("@")) {
      setStage("password");
    }
  }

  function back() {
    if (stage === "password") {
      setStage("email");
    } else if (stage === "email") {
      setStage("name");
    }
  }

  async function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (submitting) return;
    // In login mode only email + password are required (no name).
    if (mode === "signup" && (!name || !email || !password)) return;
    if (mode === "login" && (!email || !password)) return;
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
      onSuccess?.({
        username: data.user?.username ?? name ?? email.split("@")[0],
      });
    } catch (e) {
      setError("Erro de rede");
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    window.location.href = "/api/auth/google/start";
  }

  function onKeyDownField(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (stage === "password") {
        handleSubmit();
      } else {
        advance();
      }
    } else if (e.key === "Escape" && stage !== "name") {
      e.preventDefault();
      back();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="login-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 py-8"
          style={{
            background: "rgba(10, 10, 12, 0.55)",
            backdropFilter: "blur(48px) saturate(140%)",
            WebkitBackdropFilter: "blur(48px) saturate(140%)",
          }}
        >
          {/* Center radial halo */}
          <div
            aria-hidden
            className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 520,
              height: 520,
              background:
                "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(232,147,91,0.12) 35%, transparent 65%)",
              filter: "blur(20px)",
            }}
          />

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="w-full max-w-[440px] text-center mb-8">
            <h2
              className="font-display text-[30px] tracking-tight leading-tight"
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
            <AnimatePresence mode="wait">
              <motion.p
                key={stage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mt-2 text-[13.5px] text-white/60"
              >
                {STAGE_PROMPTS[stage]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Stepper content */}
          <div className="w-full max-w-[440px]">
            <AnimatePresence mode="wait">
              {stage === "name" && (
                <motion.div
                  key="name-stage"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Field
                    key="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={setName}
                    type="text"
                    autoComplete="name"
                    onSubmit={advance}
                    canAdvance={name.trim().length > 0}
                    onKeyDown={onKeyDownField}
                    showArrow
                  />
                </motion.div>
              )}
              {stage === "email" && (
                <motion.div
                  key="email-stage"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <BackChip onClick={back} />
                  <Field
                    key="email"
                    placeholder="Account email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    autoComplete="email"
                    onSubmit={advance}
                    canAdvance={email.includes("@")}
                    onKeyDown={onKeyDownField}
                    showArrow
                  />
                </motion.div>
              )}
              {stage === "password" && (
                <motion.div
                  key="password-stage"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <BackChip onClick={back} />
                  <Field
                    key="password"
                    placeholder="Crie uma senha"
                    value={password}
                    onChange={setPassword}
                    type="password"
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    onSubmit={() => handleSubmit()}
                    canAdvance={password.length > 0 && !submitting}
                    onKeyDown={onKeyDownField}
                    passwordReveal
                    submitting={submitting}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="login-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-4 max-w-[440px] w-full text-[12px] text-[#f2555f] bg-[rgba(242,85,95,0.10)] border border-[rgba(242,85,95,0.28)] rounded-md px-3 py-2"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google button — on first stage only when showGoogleOnlyOnFirstStage */}
          {(!showGoogleOnlyOnFirstStage || stage === "name") && (
            <motion.button
              onClick={handleGoogle}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className="mt-5 cursor-pointer w-full max-w-[440px] h-11 rounded-full text-[13.5px] font-medium text-white inline-flex items-center justify-center gap-2.5 transition-all"
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
            </motion.button>
          )}

          {/* Mode switch + Terms footer */}
          <div className="mt-6 text-center text-[12px] text-white/50">
            {mode === "signup" ? (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setStage("email");
                  }}
                  className="text-white hover:text-[#a78bfa] transition-colors cursor-pointer"
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setStage("name");
                  }}
                  className="text-white hover:text-[#a78bfa] transition-colors cursor-pointer"
                >
                  Criar uma
                </button>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-[10.5px] text-white/30">
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="underline hover:text-white/60">
              Termos de Serviço
            </a>
            .
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---- BackChip: small "voltar" pill above the field ---- */
function BackChip({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="cursor-pointer inline-flex items-center gap-1.5 text-[11.5px] text-white/50 hover:text-white transition-colors mb-2"
    >
      <ArrowLeft className="w-3 h-3" />
      Voltar
    </motion.button>
  );
}

/* ---- Field: liquid glass input with an inline arrow that submits ---- */
function Field({
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  onSubmit,
  canAdvance,
  onKeyDown,
  passwordReveal = false,
  submitting = false,
  showArrow = true,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  onSubmit: () => void;
  canAdvance: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  passwordReveal?: boolean;
  submitting?: boolean;
  showArrow?: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <motion.form
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="w-full"
    >
      <div
        className="flex items-center gap-2 rounded-full pl-5 pr-2 h-12 transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          border: canAdvance
            ? "1px solid rgba(255,255,255,0.18)"
            : "1px solid rgba(255,255,255,0.10)",
          boxShadow: canAdvance
            ? "0 0 0 4px rgba(167,139,250,0.12), inset 0 1px 0 rgba(255,255,255,0.10)"
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "border 250ms ease, box-shadow 250ms ease",
        }}
      >
        <input
          ref={ref}
          type={passwordReveal && reveal ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onKeyDown={onKeyDown}
          required
          disabled={submitting}
          className="flex-1 min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/40 outline-none cursor-pointer"
        />
        {passwordReveal && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setReveal((r) => !r);
            }}
            aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {showArrow && (
          <motion.button
            type="submit"
            aria-label="Avançar"
            disabled={!canAdvance}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: canAdvance
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.04)",
              border: canAdvance
                ? "1px solid rgba(255,255,255,0.20)"
                : "1px solid rgba(255,255,255,0.06)",
              color: canAdvance ? "#fff" : "rgba(255,255,255,0.40)",
            }}
            whileHover={canAdvance ? { scale: 1.05 } : undefined}
            whileTap={canAdvance ? { scale: 0.95 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            {submitting ? (
              <span className="block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </motion.button>
        )}
      </div>
    </motion.form>
  );
}

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