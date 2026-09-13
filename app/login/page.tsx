"use client";

/**
 * /login — card centralizado (referência preetsuthar17/modern-stunning-sign-in).
 *
 * Spec (2026-09-13):
 *   - Layout: card único centralizado vertical e horizontalmente
 *   - Bg: #000 puro
 *   - Logo: circle SVG cream no topo
 *   - Título "Sulfur" em mono (JetBrains Mono via --font-geist-mono)
 *   - 2 inputs (Email, Password) com rounded-2xl
 *   - Botão "Sign in" full-width
 *   - Botão "Continue with Google" full-width
 *   - "Don't have an account? Sign up, it's free!" embaixo
 *   - Sem imagem, sem avatares, sem termos, sem split-screen
 */

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.history.pushState({ noback: true }, "");
    function onPop() {
      window.history.pushState({ noback: true }, "");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "usuário ou senha inválidos");
        return;
      }
      router.push(nextPath);
    } catch {
      setError("falha de conexão");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[400px] flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] p-8"
    >
      {/* Logo circle */}
      <div className="mb-2 flex justify-center">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background:
              "repeating-linear-gradient(45deg, #f5e9d3 0 4px, #1a1a1a 4px 8px)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
          }}
        />
      </div>

      {/* Title */}
      <h1
        className="mb-4 text-center text-[24px] font-bold tracking-[-0.01em] text-white"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >
        Sulfur
      </h1>

      {/* Email */}
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/[0.06] bg-[#1a1a1a] px-4 text-sm text-foreground placeholder:text-white/40 focus:border-white/20 focus:outline-none"
      />

      {/* Password */}
      <input
        type="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-11 w-full rounded-2xl border border-white/[0.06] bg-[#1a1a1a] px-4 text-sm text-foreground placeholder:text-white/40 focus:border-white/20 focus:outline-none"
      />

      {/* Sign in */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-1 h-11 w-full rounded-2xl bg-[#2a2a2a] text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
      >
        {submitting ? "..." : "Sign in"}
      </button>

      {/* Google */}
      <a
        href="/api/auth/google/start"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2a2a2a] text-sm font-medium text-white transition-colors hover:bg-[#333]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-6 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.2 0-9.7-3.2-11.3-7.7l-6.5 5C9.6 39.6 16.2 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.8-3.9 5l6.2 5.2C42.3 35.3 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"
          />
        </svg>
        Continue with Google
      </a>

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      {/* Create account */}
      <p className="mt-2 text-center text-sm text-white/60">
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          className="text-white underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          Sign up, it&apos;s free!
        </a>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-black p-4">
      <Suspense
        fallback={
          <div className="h-[480px] w-[400px] animate-pulse rounded-2xl bg-[#0a0a0a]" />
        }
      >
        <LoginCard />
      </Suspense>
    </main>
  );
}
