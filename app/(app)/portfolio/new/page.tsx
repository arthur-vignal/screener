"use client";

/**
 * /portfolio/new — form de criar novo portfolio.
 *
 * Campos:
 *   - name (obrigatório, 2-60 chars)
 *   - description (opcional, max 280)
 *   - initialValue (opcional, default 10000)
 *   - isPublic (checkbox, default false)
 *
 * Fluxo:
 *   1. User preenche e clica "Criar"
 *   2. POST /api/portfolio
 *   3. Sucesso → router.push pra /portfolio/[slug] (futuro) ou /portfolio
 *   4. Erro → mensagem inline
 */

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent, JSX } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import {
  StaggerOnMount,
  staggerParentVariants,
} from "@/components/foundation/stagger";
import { AnimatedFloatingDock } from "@/components/foundation/sulfur-dock";
import { cn } from "@/lib/utils";

export default function NewPortfolioPage(): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initialValue, setInitialValue] = useState("10000");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          initialValue: Number(initialValue) || 10_000,
          isPublic,
        }),
      });
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Erro ${r.status}`);
        return;
      }
      const { portfolio } = (await r.json()) as { portfolio: { slug: string } };
      router.push(`/portfolio/${portfolio.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <motion.main
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants={staggerParentVariants as any}
        initial="hidden"
        animate="show"
        className="w-[90%] mx-auto py-8 pb-32"
      >
        <StaggerOnMount>
          <div className="mb-6 flex items-center gap-2 text-[12px] text-muted-foreground/70">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              Voltar pros portfolios
            </Link>
          </div>
        </StaggerOnMount>

        <StaggerOnMount>
          <div className="max-w-xl">
            <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">
              Novo
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground">
              Criar portfolio
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground/85 leading-relaxed">
              Defina nome, descrição e capital inicial. Você poderá
              adicionar ativos depois.
            </p>
          </div>
        </StaggerOnMount>

        <StaggerOnMount className="mt-8">
          <form
            onSubmit={onSubmit}
            className="max-w-xl rounded-2xl border border-white/10 bg-[#101116] p-6 space-y-5"
          >
            <Field
              label="Nome"
              required
              hint="Como você quer chamar esse portfolio? Ex: Longo prazo, Renda variável, FIIs"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Longo prazo"
                className={inputClass}
                autoFocus
              />
              <div className="text-[11px] text-muted-foreground/60 mt-1 text-right">
                {name.length}/60
              </div>
            </Field>

            <Field
              label="Descrição"
              hint="Opcional. Pra te ajudar a lembrar o objetivo do portfolio."
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="Carteira focada em blue chips e FIIs de tijolo, horizonte 5+ anos"
                className={cn(inputClass, "resize-none leading-relaxed")}
              />
              <div className="text-[11px] text-muted-foreground/60 mt-1 text-right">
                {description.length}/280
              </div>
            </Field>

            <Field
              label="Capital inicial"
              hint="Valor em BRL. Usado como base pro cálculo de retorno e distribuição de pesos entre os ativos."
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground/70">
                  R$
                </span>
                <input
                  type="number"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  min="0"
                  step="100"
                  className={cn(inputClass, "pl-10 tabular-nums")}
                />
              </div>
            </Field>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-[var(--primary)]"
              />
              <div>
                <div className="text-[13px] font-medium text-foreground">
                  Portfolio público
                </div>
                <div className="text-[12px] text-muted-foreground/70 mt-0.5">
                  Outros usuários poderão ver a composição e o desempenho.
                </div>
              </div>
            </label>

            {error && (
              <div className="rounded-md bg-[#d84f68]/10 border border-[#d84f68]/30 px-3 py-2 text-[12px] text-[#d84f68]">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href="/portfolio"
                className={cn(
                  "inline-flex items-center h-9 px-3 rounded-md",
                  "text-[12px] font-medium text-muted-foreground/85",
                  "hover:text-foreground transition-colors",
                )}
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-4 rounded-md",
                  "bg-[var(--primary)] text-[#070709]",
                  "text-[13px] font-semibold",
                  "hover:opacity-90 transition-opacity cursor-pointer",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    Criando…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Criar portfolio
                  </>
                )}
              </button>
            </div>
          </form>
        </StaggerOnMount>
      </motion.main>

      <AnimatedFloatingDock />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const inputClass = cn(
  "w-full h-10 px-3 rounded-md",
  "bg-white/[0.04] border border-white/10",
  "text-[13px] text-foreground placeholder:text-muted-foreground/50",
  "focus:outline-none focus:border-white/25 focus:bg-white/[0.06]",
  "transition-colors",
);

function Field({
  label, hint, required, children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <label className="block text-[12px] uppercase tracking-[0.14em] text-muted-foreground/85 font-semibold">
        {label}
        {required && <span className="text-[#d84f68] ml-1">*</span>}
      </label>
      {hint && (
        <p className="mt-1 text-[12px] text-muted-foreground/70 leading-relaxed">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}
