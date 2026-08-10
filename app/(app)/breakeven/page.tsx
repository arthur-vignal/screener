"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type BEPoint = {
  tenorDays: number;
  label: string;
  nominal: number;
  real: number;
  breakeven: number;
  ipcaRealized: number | null;
};

type BECurve = {
  ipcaRealized12m: number;
  selic: number;
  cdiAnnual: number;
  points: BEPoint[];
  asOf: string;
};

const BR = "\u{1F1E7}\u{1F1F7}";

export default function BreakevenPage() {
  return (
    <Suspense fallback={<BEFallback />}>
      <BEInner />
    </Suspense>
  );
}

function BEFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-48 mb-3" />
      <Skeleton className="h-32" />
    </div>
  );
}

function BEInner() {
  const [curve, setCurve] = useState<BECurve | null>(null);

  useEffect(() => {
    fetch("/api/breakeven")
      .then((r) => r.json())
      .then(setCurve)
      .catch(() => setCurve(null));
  }, []);

  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink mb-3 link-underline"
      >
        <ArrowLeft className="w-3 h-3" />
        Início
      </Link>

      <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
        Breakeven de Inflação {BR}
      </h1>
      <p className="text-body text-sm mt-1 max-w-2xl">
        Inflação implícita na curva prefixada vs IPCA realizado (12m).
        Brapi Pro não expõe a curva NTN-B; usamos uma aproximação calibrada
        na Selic meta + CDI + IPCA12m do BC.
      </p>

      {!curve ? (
        <Skeleton className="h-48 my-4" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 mb-4">
            <Stat
              label="IPCA 12m realizado"
              value={`${curve.ipcaRealized12m.toFixed(2)}%`}
              hint="IBGE"
            />
            <Stat
              label="Selic meta"
              value={`${curve.selic.toFixed(2)}% a.a.`}
              hint="Copom"
            />
            <Stat
              label="CDI anualizado"
              value={`${curve.cdiAnnual.toFixed(2)}% a.a.`}
            />
          </div>

          <div className="border border-hairline-strong overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                  <th className="text-left py-2 px-3 font-medium">Prazo</th>
                  <th className="text-right py-2 px-3 font-medium">Nominal</th>
                  <th className="text-right py-2 px-3 font-medium">Real</th>
                  <th className="text-right py-2 px-3 font-medium">
                    Breakeven implícito
                  </th>
                  <th className="text-right py-2 px-3 font-medium">
                    vs IPCA 12m
                  </th>
                </tr>
              </thead>
              <tbody>
                {curve.points.map((p, i) => {
                  const gap = p.breakeven - (p.ipcaRealized ?? 0);
                  return (
                    <tr
                      key={p.label}
                      className={cn(
                        "border-b border-hairline last:border-0 hover-row",
                        i % 2 === 0 ? "bg-canvas" : "bg-surface-elevated",
                      )}
                    >
                      <td className="py-2 px-3 num font-medium text-ink">{p.label}</td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {p.nominal.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {p.real.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 num text-right text-brand-deep font-medium">
                        {p.breakeven.toFixed(2)}%
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          Math.abs(gap) < 0.5
                            ? "text-ink"
                            : gap > 0
                              ? "text-warning"
                              : "text-positive",
                        )}
                      >
                        {gap >= 0 ? "+" : "−"}
                        {Math.abs(gap).toFixed(2)} pts
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 border border-hairline-strong text-[11.5px] text-muted leading-relaxed">
            <strong className="text-ink">Leitura:</strong> Breakeven implícito
            maior que o IPCA realizado indica mercado esperando inflação mais
            alta (hawkish). Menor = dovish. Como Brapi Pro não expõe NTN-B, a
            proxy acima usa Selic meta + IPCA12m e assume que o juro real de
            longo prazo fica próximo do carry observado no curto.
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-hairline-strong bg-surface-elevated p-3">
      <div className="label-s label-muted-2">{label}</div>
      <div className="num text-[18px] text-ink mt-1">{value}</div>
      {hint && <div className="text-[10.5px] text-faint mt-0.5">{hint}</div>}
    </div>
  );
}
