"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "erro ao criar conta");
        setLoading(false);
        return;
      }
      router.push("/portfolios");
      router.refresh();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 animate-fade-up"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-md bg-brand flex items-center justify-center mb-4 shadow-[0_0_0_0_var(--brand-glow)] hover:shadow-[0_0_0_6px_var(--brand-soft)] transition-shadow duration-200">
            <span className="text-on-brand font-bold text-lg">S</span>
          </div>
          <h1 className="font-display text-3xl text-ink tracking-tight">
            Criar conta
          </h1>
          <p className="text-sm text-muted mt-1.5">
            Salve seus índices e portfolios
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted font-medium block">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu_user"
            autoComplete="username"
            className="w-full bg-surface border border-hairline rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-colors duration-150 input-glow"
            required
            minLength={3}
            maxLength={20}
          />
          <p className="text-xs text-muted mt-1">3-20 chars (a-z, 0-9, _)</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted font-medium block">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            className="w-full bg-surface border border-hairline rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-colors duration-150 input-glow"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted font-medium block">
            Senha
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-surface border border-hairline rounded-md px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-faint transition-colors duration-150 input-glow"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink rounded transition-colors press"
              aria-label="toggle password visibility"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">mínimo 8 caracteres</p>
        </div>

        {error && (
          <div className="text-xs text-negative bg-negative-soft border border-negative/30 rounded-md px-3 py-2.5 animate-slide-down">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Criar conta"
          )}
        </Button>

        <p className="text-center text-xs text-muted">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-brand-bright link-underline font-medium"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
