"use client";

import { useState } from "react";
import { CreditCard, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Payment — plano atual + método de pagamento (mock).
 *
 * Plano: Pro mensal $30/mês, próximo ciclo em data mockada.
 * Método: Visa terminando em 4242.
 *
 * Sem integração real: botões só dão feedback visual local.
 */

const PLAN = {
  name: "Pro",
  priceMonthly: 30,
  currency: "USD",
  features: [
    "Análise avançada por ativo",
    "Carteira ilimitada",
    "Alertas de preço em tempo real",
    "Exportação CSV / PDF",
  ],
  nextBilling: "Sep 28, 2026",
};

const CARD = {
  brand: "Visa",
  last4: "4242",
  exp: "12/29",
};

export default function PaymentPage() {
  const [flash, setFlash] = useState<string | null>(null);
  const say = (m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash(null), 2200);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Current plan */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current plan
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              {PLAN.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ${PLAN.priceMonthly.toFixed(2)} {PLAN.currency}/month — next
              billing on {PLAN.nextBilling}.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              "bg-[color:var(--positive-soft)] text-[color:var(--positive)]",
            )}
          >
            <Check size={12} />
            Active
          </span>
        </header>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PLAN.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Check
                size={14}
                className="shrink-0 text-[color:var(--positive)]"
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {flash && (
            <span className="text-xs text-[color:var(--positive)]">
              {flash}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => say("Manage subscription opened (mock)")}
          >
            Manage subscription
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => say("Cancel flow started (mock)")}
          >
            Cancel plan
          </Button>
        </div>
      </section>

      {/* Payment method */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Payment method
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cartão usado na próxima cobrança.
          </p>
        </header>

        <div className="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3">
          <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-sm bg-black/40 text-foreground">
            <CreditCard size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {CARD.brand} ending in {CARD.last4}
            </p>
            <p className="text-xs text-muted-foreground">
              Expires {CARD.exp}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {flash && (
            <span className="text-xs text-[color:var(--positive)]">
              {flash}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => say("Add card flow opened (mock)")}
          >
            Add new card
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => say("Card removed (mock)")}
          >
            Remove
          </Button>
        </div>
      </section>

      {/* Invoice / history mock */}
      <section className="rounded-2xl fey-card p-2">
        <header className="px-3 pt-3 pb-2">
          <h3 className="text-sm font-semibold text-foreground">
            Recent invoices
          </h3>
        </header>
        <ul className="flex flex-col">
          {[
            { date: "Aug 28, 2026", amount: "$30.00", status: "Paid" },
            { date: "Jul 28, 2026", amount: "$30.00", status: "Paid" },
            { date: "Jun 28, 2026", amount: "$30.00", status: "Paid" },
          ].map((inv) => (
            <li
              key={inv.date}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-3 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{inv.date}</span>
              <span className="text-right font-mono text-xs text-foreground">
                {inv.amount}
              </span>
              <span className="inline-flex items-center justify-end gap-1.5 text-xs text-[color:var(--positive)]">
                <Check size={12} />
                {inv.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
