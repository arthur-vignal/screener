"use client";

import { Suspense, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type MacroSeries = {
  slug: string;
  name: string;
  unit: string;
  category: string;
  frequency: string;
  last: number;
  lastDate: string;
  sparkline: number[];
  description: string;
};

const SLUG_META: Record<
  string,
  { title: string; subtitle: string; unitFmt: (v: number, unit: string) => string; cadence: string }
> = {
  selic: {
    title: "Taxa Selic",
    subtitle: "Taxa básica de juros — referência do Copom",
    unitFmt: (v, u) => (u === "percentPerYear" ? `${v.toFixed(2)}% a.a.` : `${v.toFixed(4)}%`),
    cadence: "Diária",
  },
  cdi: {
    title: "CDI",
    subtitle: "Taxa interbancária (referência renda fixa)",
    unitFmt: (v) => `${v.toFixed(4)}% d (≈ ${(v * 252).toFixed(2)}% a.a.)`,
    cadence: "Diária",
  },
  ipca12m: {
    title: "IPCA 12m",
    subtitle: "Inflação oficial 12 meses (IBGE)",
    unitFmt: (v) => `${v.toFixed(2)}%`,
    cadence: "Mensal",
  },
  igpm: {
    title: "IGP-M",
    subtitle: "Índice Geral de Preços do Mercado (FGV)",
    unitFmt: (v) => `${v.toFixed(2)}% m (≈ ${(v * 12).toFixed(2)}% a.a.)`,
    cadence: "Mensal",
  },
  ibcbr: {
    title: "IBC-Br",
    subtitle: "Índice de Atividade Econômica do BC",
    unitFmt: (v) => `${v.toFixed(2)} pts`,
    cadence: "Mensal",
  },
  pibmensal: {
    title: "PIB mensal",
    subtitle: "Produto Interno Bruto mensal (IBGE)",
    unitFmt: (v) => `R$ ${(v / 1000).toFixed(2)} bi`,
    cadence: "Mensal",
  },
  desemprego: {
    title: "Desemprego",
    subtitle: "Taxa de desocupação (PNAD Contínua)",
    unitFmt: (v) => `${v.toFixed(1)}%`,
    cadence: "Mensal",
  },
};

export default function MacroPage() {
  return (
    <Suspense fallback={<MacroFallback />}>
      <MacroInner />
    </Suspense>
  );
}

function MacroFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

function MacroInner() {
  const [series, setSeries] = useState<MacroSeries[] | null>(null);

  useEffect(() => {
    fetch("/api/macro")
      .then((r) => r.json())
      .then((d) => setSeries(d.series ?? []))
      .catch(() => setSeries([]));
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
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-ink tracking-tight">
            Painel Macro BR 🇧🇷
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Indicadores macro brasileiros: Selic, CDI, IPCA, IGP-M, IBC-Br, PIB
            mensal e Desemprego. Dados via Brapi Pro (Banco Central + IBGE).
          </p>
        </div>
        {series && (
          <div className="label-s label-muted-2">
            Atualizado:{" "}
            {new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {!series ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="border border-hairline-strong p-6 text-center label-s text-muted">
          Sem dados disponíveis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {series.map((s) => (
            <MacroCard key={s.slug} series={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function MacroCard({ series }: { series: MacroSeries }) {
  const meta = SLUG_META[series.slug] ?? {
    title: series.name,
    subtitle: series.description.slice(0, 80),
    unitFmt: (v: number) => v.toFixed(2),
    cadence: series.frequency,
  };

  return (
    <div className="border border-hairline-strong bg-surface-elevated p-5 hover-lift">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="font-display text-[15px] text-ink tracking-tight">
            {meta.title}
          </h3>
          <p className="text-[11px] text-muted mt-0.5 max-w-xs">{meta.subtitle}</p>
        </div>
        <span className="label-s text-faint">{meta.cadence}</span>
      </div>

      <div className="num num-md text-ink mt-2">{meta.unitFmt(series.last, series.unit)}</div>
      <div className="text-[10.5px] text-faint mt-1">
        Última leitura:{" "}
        {new Date(series.lastDate).toLocaleDateString("pt-BR")
        }
      </div>

      <div className="mt-3 h-12">
        <Sparkline values={series.sparkline} />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null;
  const w = 240;
  const h = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const path = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const positive = values[values.length - 1] >= values[0];
  const color = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <path
        d={path}
        stroke={color}
        strokeWidth="1.3"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
