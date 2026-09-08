"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Referrals — programa de invite (mock).
 *
 * Mostra código único do usuário, contadores (mock: 0 invites, $0
 * earned) e CTA "Share invite link".
 */

const MOCK_CODE = "SULFUR-ARTHUR-X9";

const MOCK_STATS = [
  { label: "Friends invited", value: 0 },
  { label: "Signed up", value: 0 },
  { label: "Earned", value: "$0.00" },
];

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // mock fallback silencioso
    }
  };

  const onShare = async () => {
    const url = `https://sulfur.io/r/${MOCK_CODE}`;
    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: "Join me on Sulfur",
          text: "Use my invite code and we both get a free month of Pro.",
          url,
        });
        return;
      } catch {
        /* user cancelou ou share indisponível → cai pro clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Card principal */}
      <section className="rounded-2xl fey-card p-5">
        <header className="mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Invite friends, earn Pro
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada amigo que assinar Pro usando seu código te dá{" "}
            <span className="font-medium text-foreground">1 mês grátis</span>{" "}
            — e ele ganha{" "}
            <span className="font-medium text-foreground">$10</span> de
            crédito na primeira análise avançada.
          </p>
        </header>

        {/* Code */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] p-2">
          <div className="flex h-9 flex-1 items-center justify-center rounded-sm bg-black/30 px-3 font-mono text-sm tracking-wider text-foreground">
            {MOCK_CODE}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onCopy}
            aria-label="Copy invite code"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* CTA */}
        <div className="mt-4">
          <Button
            variant="default"
            size="default"
            className="w-full"
            onClick={onShare}
          >
            Share invite link
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl fey-card p-2">
        <ul className="flex divide-x divide-white/[0.06]">
          {MOCK_STATS.map((s) => (
            <li
              key={s.label}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 py-3 text-center"
            >
              <span className="text-base font-semibold tracking-tight text-foreground">
                {s.value}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="rounded-2xl fey-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          How it works
        </h3>
        <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
          <Step n={1} title="Share your code">
            Mande o link ou código pra amigos, redes sociais, etc.
          </Step>
          <Step n={2} title="They sign up for Pro">
            Seu amigo ativa Pro usando seu código e ganha $10 de crédito.
          </Step>
          <Step n={3} title="You both win">
            Você ganha 1 mês grátis por cada signup. Sem limite.
          </Step>
        </ol>
      </section>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-[11px] font-medium text-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
