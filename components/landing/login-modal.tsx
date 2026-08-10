"use client";

import { useEffect, useState } from "react";
import { X, Mail, Lock, User } from "lucide-react";
import { LiquidGlassButton } from "./liquid-glass-button";

/**
 * LoginModal — Fey-style login / signup popup. When opened, the
 * surrounding content is blurred (CSS backdrop-filter on a wrapper
 * overlay) and this card slides in centered.
 *
 * Two modes:
 *   - mode="signup": full name + email + password
 *   - mode="login": email + password + a "create account" link
 *
 * The parent component (the landing page) toggles the "signup-success"
 * stage via the onSuccess callback, which receives the username.
 */
export function LoginModal({
  open,
  initialMode = "signup",
  onClose,
  onSuccess,
}: {
  open: boolean;
  initialMode?: "login" | "signup";
  onClose: () => void;
  onSuccess: (username: string) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
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

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body =
        mode === "signup"
          ? JSON.stringify({ username: name, email, password })
          : JSON.stringify({ email, password });
      const r = await fetch(endpoint, {
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
      const fallbackName = name.split(" ")[0] || "convidado";
      onSuccess(data.user?.username ?? fallbackName);
    } catch (e) {
      setError("Erro de rede");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: "rgba(10, 10, 12, 0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        animation: "fadeIn 200ms ease",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl p-7"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,26,30,0.92) 0%, rgba(19,19,22,0.96) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent halo */}
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
          className="absolute top-4 right-4 text-[#9a9ba3] hover:text-white transition-colors press"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#9a9ba3] mb-3">
            {mode === "signup" ? "Bem Vindo a Sulfur" : "Bem Vindo de Volta"}
          </div>
          <h2 className="font-display text-[26px] tracking-[-0.02em] text-white">
            {mode === "signup"
              ? "Crie sua conta"
              : "Entre na sua conta"}
          </h2>
          <p className="mt-2 text-[13px] text-[#9a9ba3]">
            {mode === "signup"
              ? "Para começar, crie sua conta."
              : "Para continuar, entre com seu email."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Field
              icon={<User className="w-3.5 h-3.5" />}
              placeholder="Seu nome"
              value={name}
              onChange={setName}
              type="text"
              autoComplete="name"
            />
          )}
          <Field
            icon={<Mail className="w-3.5 h-3.5" />}
            placeholder="voce@email.com"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
          />
          <Field
            icon={<Lock className="w-3.5 h-3.5" />}
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

          <LiquidGlassButton
            type="submit"
            disabled={submitting}
            className="w-full"
          >
            {submitting
              ? "..."
              : mode === "signup"
                ? "Criar conta"
                : "Entrar"}
          </LiquidGlassButton>
        </form>

        <div className="mt-5 text-center text-[12px] text-[#9a9ba3]">
          {mode === "signup" ? (
            <>
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-white hover:text-[#a78bfa] transition-colors link-underline"
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
                className="text-white hover:text-[#a78bfa] transition-colors link-underline"
              >
                Criar uma
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[#65666e]">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[#65666e] outline-none"
      />
    </div>
  );
}
