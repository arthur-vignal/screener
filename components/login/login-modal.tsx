"use client";

/**
 * LoginModal (stepper) - one-field-at-a-time auth UI inspired by
 * Typeform + the Fey reference. The modal sits on the blurred
 * backdrop but renders each field on its own line, animated in/out
 * with framer-motion's AnimatePresence + slide+fade transitions.
 *
 * Stages:
 *   1. name  -> Seu nome           (arrow advances to email)
 *   2. email -> Account email      (arrow advances to password)
 *   3. password -> Senha           (Enter or arrow submits)
 *   4. review -> [Criar conta] + [Continuar com Google]
 *
 * No card wrapper. Each stage animates in independently.
 */

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowRight } from "lucide-react";

type Mode = "signup" | "login";
type Stage = "name" | "email" | "password" | "review";

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
    } else if (stage === "password" && password.length > 0) {
      setStage("review");
    }
  }

  function back() {
    if (stage === "password") setStage("email");
    else if (stage === "email") setStage("name");
    else if (stage === "review") setStage("password");
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
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
    window.location.href = "/api/auth/google/start";
  }

  // Drive the stage transitions with Enter (advance) and Shift+Tab (back)
  function onKeyDownField(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (stage === "review") handleSubmit();
      else advance();
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
          transition={{ duration: 0.35, ease: "easeOut" }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-start px-6 pt-24 md:pt-32"
          style={{
            background: "rgba(10, 10, 12, 0.45)",
            backdropFilter: "blur(28px) saturate(140%)",
            WebkitBackdropFilter: "blur(28px) saturate(140%)",
          }}
        >
          {/* Center radial halo (Fey touch) */}
          <div
            aria-hidden
            className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 520,
              height: 520,
              background:
                "radial-gradient(circle, rgba(167,139,250,0.20) 0%, rgba(232,147,91,0.10) 35%, transparent 65%)",
              filter: "blur(20px)",
            }}
          />

          <button
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header — title + subtitle (always present, doesn't change) */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-[420px] text-center mb-10"
          >
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
            <p className="mt-1.5 text-[13px] text-white/55">
              {mode === "signup"
                ? "Para começar, crie sua conta."
                : "Entre com seu email para continuar."}
            </p>
          </motion.div>

          {/* Stepper content (no card) */}
          <div className="w-full max-w-[420px]">
            <AnimatePresence mode="wait">
              {stage === "name" && (
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
                  inputRef={(el) => (window._stageName = el)}
                />
              )}
              {stage === "email" && (
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
              )}
              {stage === "password" && (
                <Field
                  key="password"
                  placeholder="Senha"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  onSubmit={() => setStage("review")}
                  canAdvance={password.length > 0}
                  onKeyDown={onKeyDownField}
                  showArrow
                  passwordReveal
                />
              )}
              {stage === "review" && (
                <ReviewStep
                  key="review"
                  name={name}
                  email={email}
                  password={password}
                  mode={mode}
                  submitting={submitting}
                  error={error}
                  onSubmit={handleSubmit}
                  onGoogle={handleGoogle}
                  onEdit={back}
                  onSwitchMode={() => {
                    setMode(mode === "signup" ? "login" : "signup");
                    setStage(mode === "signup" ? "email" : "email");
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
  showArrow = true,
  passwordReveal = false,
  inputRef,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  onSubmit: () => void;
  canAdvance: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  showArrow?: boolean;
  passwordReveal?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [reveal, setReveal] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <motion.form
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="w-full"
    >
      <div
        className="flex items-center gap-2 rounded-full px-4 h-12 transition-all"
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(14px) saturate(160%)",
          WebkitBackdropFilter: "blur(14px) saturate(160%)",
          border: canAdvance
            ? "1px solid rgba(255,255,255,0.14)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: canAdvance
            ? "0 0 0 4px rgba(167,139,250,0.10), inset 0 1px 0 rgba(255,255,255,0.10)"
            : "inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "border 250ms ease, box-shadow 250ms ease",
        }}
      >
        <input
          ref={(el) => {
            ref.current = el;
            inputRef?.(el);
          }}
          type={passwordReveal && reveal ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onKeyDown={onKeyDown}
          required
          className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/40 outline-none"
        />
        {passwordReveal && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="text-[10.5px] text-white/50 hover:text-white/80 transition-colors px-1.5"
            tabIndex={-1}
          >
            {reveal ? "OCULTAR" : "MOSTRAR"}
          </button>
        )}
        {showArrow && (
          <motion.button
            type="submit"
            aria-label="Avançar"
            disabled={!canAdvance}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: canAdvance
                ? "rgba(255,255,255,0.10)"
                : "rgba(255,255,255,0.04)",
              border: canAdvance
                ? "1px solid rgba(255,255,255,0.18)"
                : "1px solid rgba(255,255,255,0.06)",
              color: canAdvance ? "#fff" : "rgba(255,255,255,0.40)",
            }}
            whileHover={canAdvance ? { scale: 1.05 } : undefined}
            whileTap={canAdvance ? { scale: 0.95 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    </motion.form>
  );
}

/* ---- ReviewStep: shows summary + final submit + Google button ---- */
function ReviewStep({
  name,
  email,
  password,
  mode,
  submitting,
  error,
  onSubmit,
  onGoogle,
  onEdit,
  onSwitchMode,
}: {
  name: string;
  email: string;
  password: string;
  mode: Mode;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onGoogle: () => void;
  onEdit: () => void;
  onSwitchMode: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full space-y-3"
    >
      {/* Summary chips (clickable to edit) */}
      <div className="space-y-1.5">
        <ReviewChip label="Nome" value={name} onEdit={onEdit} />
        <ReviewChip label="Email" value={email} onEdit={onEdit} />
      </div>

      {error && (
        <div className="text-[12px] text-[#f2555f] bg-[rgba(242,85,95,0.10)] border border-[rgba(242,85,95,0.26)] rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Final submit */}
      <motion.button
        onClick={onSubmit}
        disabled={submitting}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="w-full h-12 rounded-full text-[14px] font-semibold text-white inline-flex items-center justify-center transition-all disabled:opacity-50"
        style={{
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 24px rgba(0,0,0,0.30)",
        }}
      >
        {submitting
          ? "..."
          : mode === "signup"
            ? "Criar conta"
            : "Entrar"}
      </motion.button>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10.5px] text-white/40 tracking-wider">OU</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <motion.button
        onClick={onGoogle}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="w-full h-12 rounded-full text-[14px] font-medium text-white inline-flex items-center justify-center gap-2.5 transition-all"
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

      <div className="text-center text-[12px] text-white/50 pt-1">
        {mode === "signup" ? (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              onClick={onSwitchMode}
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
              onClick={onSwitchMode}
              className="text-white hover:text-[#a78bfa] transition-colors"
            >
              Criar uma
            </button>
          </>
        )}
      </div>

      <p className="text-center text-[10.5px] text-white/30 pt-2">
        Ao continuar, você concorda com nossos{" "}
        <a href="#" className="underline hover:text-white/60">
          Termos de Serviço
        </a>
        .
      </p>
    </motion.div>
  );
}

function ReviewChip({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onEdit}
      whileHover={{ scale: 1.005 }}
      className="w-full flex items-center gap-3 rounded-full px-4 h-10 text-left"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(10px) saturate(160%)",
        WebkitBackdropFilter: "blur(10px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[10.5px] uppercase tracking-wider text-white/40 w-12 shrink-0">
        {label}
      </span>
      <span className="text-[13.5px] text-white truncate flex-1">{value}</span>
      <span className="text-[10.5px] text-white/30 hover:text-white/60 transition-colors">
        EDITAR
      </span>
    </motion.button>
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

// Helper so we can store the latest input ref on window during animation
declare global {
  interface Window {
    _stageName?: HTMLInputElement | null;
  }
}