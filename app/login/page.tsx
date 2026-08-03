"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "erro ao logar");
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
            Entrar
          </h1>
          <p className="text-sm text-muted mt-1.5">
            Acesse seus índices e portfolios
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
            className="w-full bg-surface border border-hairline rounded-md px-3.5 py-2.5 text-sm text-ink placeholder:text-faint transition-colors duration-150 focus:outline-none focus:border-brand focus:bg-surface-elevated"
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
              autoComplete="current-password"
              className="w-full bg-surface border border-hairline rounded-md px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-faint transition-colors duration-150 focus:outline-none focus:border-brand focus:bg-surface-elevated"
              required
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
            "Entrar"
          )}
        </Button>

        <p className="text-center text-xs text-muted">
          Sem conta?{" "}
          <Link
            href="/signup"
            className="text-brand-bright link-underline font-medium"
          >
            Criar agora
          </Link>
        </p>
      </form>
    </div>
  );
}
