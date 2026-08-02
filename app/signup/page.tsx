"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto rounded-md bg-accent flex items-center justify-center mb-3">
            <span className="text-white font-bold">S</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-text-secondary mt-1">
            Salve seus índices e portfolios
          </p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu_user"
            autoComplete="username"
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
            required
            minLength={3}
            maxLength={20}
          />
          <p className="text-xs text-text-muted mt-1">3-20 chars (a-z, 0-9, _)</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
            required
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted font-medium block mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-surface border border-border rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:border-foreground/30"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-foreground"
              aria-label="toggle password visibility"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1">mínimo 8 caracteres</p>
        </div>

        {error && (
          <div className="text-xs text-negative bg-negative/10 border border-negative/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            "Criar conta"
          )}
        </button>

        <p className="text-center text-xs text-text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
