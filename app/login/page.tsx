"use client";

/**
 * /login — split-screen 1:1 (referência lavikatiyar).
 *
 * Layout (2026-09-13):
 *   - Sem top bar (igual referência original)
 *   - 2 colunas (50/50 em desktop, stack em mobile)
 *   - Esquerda: logo "Sulfur" + form Email/Password tradicional
 *     (Welcome! + subtitle + Email + Password + Remember + Forgot + Continue)
 *   - Direita: imagem de montanha full-bleed
 */

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block back navigation
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
      className="flex w-full max-w-[400px] flex-col gap-6"
    >
      {/* Welcome + subtitle */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] font-bold tracking-[-0.01em] text-white">
          Welcome!
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in by entering the information below
        </p>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-white">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-foreground placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-white">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 w-full rounded-md border border-white/15 bg-transparent px-3 text-sm text-foreground placeholder:text-white/30 focus:border-white/40 focus:outline-none"
        />
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-transparent accent-white"
          />
          Remember Me
        </label>
        <a
          href="/signup"
          className="text-muted-foreground transition-colors hover:text-white"
        >
          Forgotten Password
        </a>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 h-11 w-full rounded-md bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "..." : "Continue"}
      </button>

      {/* Error */}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      {/* Create account */}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          className="font-semibold text-white transition-opacity hover:opacity-80"
        >
          Create one here
        </a>
        .
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen w-full grid-cols-1 bg-black text-foreground lg:grid-cols-2">
      {/* ESQUERDA — Form 1:1 com referência */}
      <div className="flex flex-col justify-start px-12 pt-16 pb-12 lg:px-20 lg:pt-24">
        {/* Logo Sulfur (cream bold ~22px) */}
        <h1
          className="mb-20 text-[22px] font-bold tracking-[-0.01em] text-foreground"
          style={{ color: "#f5e9d3", fontFamily: "var(--font-roboto-slab)" }}
        >
          Sulfur
        </h1>

        <Suspense
          fallback={
            <div className="h-96 w-full max-w-[400px] animate-pulse rounded-md bg-white/[0.02]" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* DIREITA — Imagem de montanha full-bleed */}
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <Image
          src="/login-mountain.jpg"
          alt="Montanha nevada"
          fill
          priority
          quality={95}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "center 35%" }}
        />
      </div>
    </main>
  );
}
