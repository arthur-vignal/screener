"use client";

import { useState } from "react";

/**
 * Options — toggles de preferências.
 *
 * Switches construídos na hora (sem shadcn Switch — não existe no
 * projeto, e o constraint é não adicionar deps). Visual casa com
 * o resto do app: pill claro quando ativo, anel com bg-muted quando
 * desligado.
 */

type Toggle = {
  id: string;
  title: string;
  description: string;
  defaultOn?: boolean;
};

const TOGGLES: Toggle[] = [
  {
    id: "hide-nav-hints",
    title: "Hide nav hints",
    description: "Esconde dicas de navegação no dock flutuante.",
    defaultOn: false,
  },
  {
    id: "hide-nav-dock",
    title: "Hide nav dock",
    description: "Oculta o dock inferior (você ainda pode voltar via atalhos).",
    defaultOn: false,
  },
  {
    id: "weekly-newsletter",
    title: "Weekly newsletter",
    description: "Resumo semanal do mercado BR todo domingo.",
    defaultOn: true,
  },
  {
    id: "price-alerts",
    title: "Price alerts",
    description: "Notificações push em oscilações relevantes dos seus ativos.",
    defaultOn: true,
  },
  {
    id: "compact-mode",
    title: "Compact mode",
    description: "Reduz densidade de linhas em listas (carteira, busca).",
    defaultOn: false,
  },
];

export default function OptionsPage() {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.id, !!t.defaultOn])),
  );

  const toggle = (id: string) =>
    setState((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl fey-card p-2">
        <ul className="flex flex-col divide-y divide-white/[0.06]">
          {TOGGLES.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-4 px-3 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <Switch
                checked={!!state[t.id]}
                onChange={() => toggle(t.id)}
                ariaLabel={t.title}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 " +
        (checked ? "bg-[color:var(--positive)]" : "bg-white/[0.12]")
      }
    >
      <span
        aria-hidden="true"
        className={
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-[18px]" : "translate-x-[2px]")
        }
      />
    </button>
  );
}
