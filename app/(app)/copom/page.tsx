"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type CurvePoint = {
  tenorDays: number;
  tenorLabel: string;
  rate: number;
  forward?: number;
  copomMeeting?: string;
};

type Curve = {
  selic: number;
  cdiAnnual: number;
  points: CurvePoint[];
  asOf: string;
};

const BR = "\u{1F1E7}\u{1F1F7}";

export default function CopomPage() {
  return (
    <Suspense fallback={<CopomFallback />}>
      <CopomInner />
    </Suspense>
  );
}

function CopomFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-64 mb-3" />
      <Skeleton className="h-32" />
    </div>
  );
}

function CopomInner() {
  const [curve, setCurve] = useState<Curve | null>(null);

  useEffect(() => {
    fetch("/api/copom")
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
        Copom Watch {BR}
      </h1>
      <p className="text-body text-sm mt-1 max-w-2xl">
        Curva de juros prefixada implícita (proxy via Selic meta + CDI). Brapi
        Pro não expõe DI1 futures series; usamos um modelo calibrado no 1y
        forward até um feed real de curva ser conectado.
      </p>

      {!curve ? (
        <Skeleton className="h-72 my-4" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-4">
            <Stat label="Selic meta" value={`${curve.selic.toFixed(2)}% a.a.`} />
            <Stat label="CDI anualizado" value={`${curve.cdiAnnual.toFixed(2)}% a.a.`} />
            <Stat
              label="Spread curva"
              value={`${(curve.cdiAnnual - curve.selic).toFixed(2)} pts`}
              hint="Selic vs 1y forward"
            />
            <Stat
              label="Atualizado"
              value={new Date(curve.asOf).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              hint="Cache 1h"
            />
          </div>

          {/* Curve chart */}
          <div className="border border-hairline-strong p-4 mb-4 bg-canvas-soft">
            <h2 className="font-display text-[16px] text-ink mb-3">
              Curva prefixada implícita (taxa % a.a.)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={curve.points.map((p) => ({
                    label: p.tenorLabel,
                    rate: p.rate,
                    forward: p.forward,
                  }))}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid stroke="var(--hairline)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={{ stroke: "var(--hairline-strong)" }}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--faint)", fontFamily: "var(--font-mono)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "var(--faint)", fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v: number) => `${v.toFixed(2)}%`}
                    orientation="right"
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elevated)",
                      border: "1px solid var(--hairline-strong)",
                      borderRadius: 0,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                    formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--brand-deep)"
                    strokeWidth={1.8}
                    dot={{ r: 3, fill: "var(--brand-deep)" }}
                    activeDot={{ r: 5 }}
                    name="Taxa"
                  />
                  <Line
                    type="monotone"
                    dataKey="forward"
                    stroke="var(--warning)"
                    strokeWidth={1.4}
                    strokeDasharray="3 3"
                    dot={{ r: 2, fill: "var(--warning)" }}
                    name="Forward"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forward rates table */}
          <h2 className="font-display text-[16px] text-ink mb-3">
            Taxas forward entre vértices
          </h2>
          <div className="border border-hairline-strong overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-s label-muted-2 border-b border-hairline-strong h-8 bg-canvas-soft">
                  <th className="text-left py-2 px-3 font-medium">Prazo</th>
                  <th className="text-right py-2 px-3 font-medium">Taxa</th>
                  <th className="text-right py-2 px-3 font-medium">Forward próx.</th>
                  <th className="text-right py-2 px-3 font-medium">Δ pts</th>
                  <th className="text-left py-2 px-3 font-medium">Reunião Copom</th>
                </tr>
              </thead>
              <tbody>
                {curve.points.map((p, i) => {
                  const prev = curve.points[i - 1]?.rate;
                  const delta = prev != null ? p.rate - prev : null;
                  return (
                    <tr
                      key={p.tenorLabel}
                      className="border-b border-hairline last:border-0 hover-row"
                    >
                      <td className="py-2 px-3 num font-medium text-ink">{p.tenorLabel}</td>
                      <td className="py-2 px-3 num text-right text-ink">
                        {p.rate.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 num text-right text-warning">
                        {p.forward != null ? `${p.forward.toFixed(2)}%` : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2 px-3 num text-right font-medium",
                          delta == null
                            ? "text-faint"
                            : delta > 0
                              ? "text-positive"
                              : delta < 0
                                ? "text-negative"
                                : "text-ink",
                        )}
                      >
                        {delta == null
                          ? "—"
                          : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}`}
                      </td>
                      <td className="py-2 px-3 text-[11.5px] text-muted">
                        {p.copomMeeting
                          ? new Date(p.copomMeeting).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
