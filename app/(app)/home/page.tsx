"use client";

/**
 * Home — authenticated dashboard (Fey-style).
 *
 * Layout (matches the Fey reference screenshot):
 * - Top bar: logo + greeting "Hello, {name}" (left) ·
 *            market status + clock + theme toggle (right)
 * - Main split: 60% left (Sentiment widget + Sector list) ·
 *                40% right (Daily recap + News)
 * - Floating dock (bottom, macOS-style magnify on hover)
 * - Footer
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import {
  Home,
  Compass,
  Calendar,
  Bookmark,
  Mail,
  Bell,
  Search,
  Moon,
  Sun,
  Clock,
} from "lucide-react";
import { FloatingDock, type FloatingDockItem } from "@/components/ui/floating-dock";

const BR = "\u{1F1E7}\u{1F1F7}";

// ------- Mock data -------
type SectorRow = {
  name: string;
  change: number;
};

const SECTORS: SectorRow[] = [
  { name: "Saúde", change: 0.88 },
  { name: "Financeiro", change: 0.65 },
  { name: "Imobiliário", change: 0.52 },
  { name: "Consumo Não Cíclico", change: 0.39 },
  { name: "Energia", change: 0.23 },
  { name: "Comunicações", change: 0.19 },
  { name: "Materiais Básicos", change: 0.02 },
  { name: "Industrial", change: -0.32 },
  { name: "Utilidades Públicas", change: -0.37 },
  { name: "Consumo Cíclico", change: -0.6 },
  { name: "Tecnologia", change: -1.23 },
];

type NewsItem = {
  badge: string;
  recency: string;
  headline: string;
};

const NEWS: NewsItem[] = [
  {
    badge: "Recap",
    recency: "Hoje, 6:00",
    headline:
      "Ibovespa fecha em alta com otimismo externo; dólar recua após fala de Haddad sobre disciplina fiscal.",
  },
  {
    badge: "PETR",
    recency: "Hoje, 10min",
    headline:
      "Petrobras anuncia novo plano de dividendos para 2026 enquanto Vale reporta queda de 8% na produção.",
  },
  {
    badge: "NVDA",
    recency: "Hoje, 1h",
    headline:
      "Nvidia mostra que data centers seguem puxando receita apesar da queda em gaming.",
  },
  {
    badge: "TSLA",
    recency: "Hoje, 2h",
    headline:
      "Tesla corta preços do Model Y em 5% na China para recuperar market share.",
  },
  {
    badge: "MXRF",
    recency: "Hoje, 3h",
    headline:
      "FII MXRF11 anuncia redução de 8% no dividendo mensal com explicação de provisões.",
  },
];

// ------- Helpers -------
function ptDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function brTime() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isB3Open(): boolean {
  const now = new Date();
  const brt = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  const day = brt.getDay();
  const min = brt.getHours() * 60 + brt.getMinutes();
  if (day === 0 || day === 6) return false;
  return min >= 10 * 60 && min <= 17 * 60 + 30;
}

function makeIovSeries(): Array<{ t: number; v: number }> {
  let v = 120000;
  return Array.from({ length: 260 }, (_, i) => {
    v += (Math.random() - 0.48) * 600;
    v = Math.max(110000, Math.min(135000, v));
    return { t: i, v: Math.round(v) };
  });
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

// ------- Main -------
export default function HomePage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [clock, setClock] = useState(brTime());
  const open = isB3Open();

  useEffect(() => {
    const id = setInterval(() => setClock(brTime()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const dockItems: FloatingDockItem[] = [
    { title: "Home", icon: <Home className="h-5 w-5" />, href: "/home" },
    { title: "Análise", icon: <Compass className="h-5 w-5" />, href: "/analysis" },
    { title: "Calendário", icon: <Calendar className="h-5 w-5" />, href: "/dividends" },
    { title: "Portfólios", icon: <Bookmark className="h-5 w-5" />, href: "/portfolios" },
    { title: "Mensagens", icon: <Mail className="h-5 w-5" />, href: "/news" },
    { title: "Alertas", icon: <Bell className="h-5 w-5" />, href: "/watchlist" },
    { title: "Buscar", icon: <Search className="h-5 w-5" />, href: "/screener" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>
      <main
        className="max-w-[1400px] mx-auto px-6 pt-6 pb-32 grid gap-6"
        style={{ gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)" }}
      >
        <section className="space-y-6">
          <SentimentWidget />
          <SectorWidget sectors={SECTORS} />
        </section>
        <section className="space-y-6">
          <RecapWidget />
          <NewsWidget items={NEWS} />
        </section>
      </main>

      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FloatingDock items={dockItems} />
        </div>
      </div>

      <footer className="max-w-[1400px] mx-auto px-6 pb-8 pt-12 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-5 bg-foreground text-background flex items-center justify-center rounded">
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
              <path
                d="M3 17l5-5 4 4 7-8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Sulfur
        </span>
        <span>Sulfur.io · 2026</span>
      </footer>
    </div>
  );
}

// ------- Widgets -------
function SentimentWidget() {
  const series = makeIovSeries();
  const pct = ((series[series.length - 1].v - series[0].v) / series[0].v) * 100;
  const last = series[series.length - 1].v;
  const sentiment = pct >= 1 ? "em alta" : pct <= -1 ? "em queda" : "neutro";
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {ptDate()}
        </span>
      </div>
      <h2 className="text-[26px] tracking-tight font-medium">
        O mercado está <strong>{sentiment}</strong>
      </h2>

      <div className="mt-5 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="ibovG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#489ffa" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#489ffa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
            <Tooltip
              contentStyle={{
                background: "rgba(7,7,9,0.92)",
                border: "1px solid rgba(238,239,241,0.12)",
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "var(--font-manrope)",
              }}
              labelFormatter={(t) => `dia ${t}`}
              formatter={(v: any) => v.toLocaleString("pt-BR")}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#489ffa"
              strokeWidth={1.4}
              fill="url(#ibovG)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-3 text-[12.5px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-3 w-px bg-border" />
            Ibovespa
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="h-3 w-px bg-border" />
            IPCA
          </span>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground border border-border px-2 py-0.5 rounded-full text-[11px]">
            + Portfólio
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          {["1M", "3M", "YTD", "1A", "2A"].map((r, i) => (
            <button
              key={r}
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                i === 3 ? "bg-muted text-foreground font-medium" : "hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-[12px]">
        <Stat label="Ibovespa" value={last.toLocaleString("pt-BR")} change={pct} />
        <Stat label="Dólar" value="R$ 5,15" change={-0.32} />
        <Stat label="Selic" value="14.25%" />
      </div>
    </div>
  );
}

function Stat({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <div className="border border-border rounded-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="num text-[16px] text-foreground mt-0.5">{value}</div>
      {change != null && (
        <div
          className={cn(
            "text-[11px] num font-medium",
            change >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
          )}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function SectorWidget({ sectors }: { sectors: SectorRow[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 pt-5 pb-3 flex items-baseline justify-between border-b border-border">
        <h3 className="text-[15px] font-medium tracking-tight">Setores</h3>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          1D
        </span>
      </div>
      <div className="px-6 py-3 divide-y divide-border">
        {sectors.map((s) => (
          <SectorRow key={s.name} sector={s} />
        ))}
      </div>
    </div>
  );
}

function SectorRow({ sector }: { sector: SectorRow }) {
  const isUp = sector.change >= 0;
  const intensity = Math.min(1, Math.abs(sector.change) / 1.5);
  return (
    <div className="grid grid-cols-[1fr_70px_1fr] items-center py-2 text-[13px]">
      <span className="text-foreground">{sector.name}</span>
      <span
        className={cn(
          "text-right num font-medium",
          isUp ? "text-[var(--positive)]" : "text-[var(--negative)]",
        )}
      >
        {isUp ? "+" : ""}
        {sector.change.toFixed(2)}%
      </span>
      <div className="ml-4 h-2 rounded-full bg-muted overflow-hidden flex">
        <div
          className={cn("h-full rounded-full")}
          style={{
            width: `${intensity * 100}%`,
            background: isUp ? "var(--positive)" : "var(--negative)",
          }}
        />
      </div>
    </div>
  );
}

function RecapWidget() {
  const recap =
    "Fundos de hedge reduzem exposição a tecnologia e mídia enquanto possível correção se desenha no radar. Petroleiras e miners vão na contramão com hedge de supply. Enquanto isso, fatores geopolíticos seguem pesando na confiança global e o fluxo para emergentes perdeu força esta semana.";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground/80" />
          Resumo do dia
        </span>
        <span className="text-[10.5px] text-muted-foreground">Hoje, 6:00</span>
      </div>
      <p className="text-[14px] leading-relaxed text-foreground/95">
        {recap}{" "}
        <Link href="/news" className="text-[var(--chart-1)] hover:underline">
          Ler mais
        </Link>
      </p>
    </div>
  );
}

function NewsWidget({ items }: { items: NewsItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[14px] font-medium">Notícias</h3>
        <span className="text-[11px] text-muted-foreground">{items.length - 1} itens</span>
      </div>
      <div className="divide-y divide-border">
        {items.slice(1).map((n, i) => (
          <NewsRow key={i} item={n} />
        ))}
      </div>
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <div className="px-5 py-4 flex items-start gap-3">
      <span
        className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-semibold tracking-tight text-foreground/90 shrink-0"
        title={item.badge}
      >
        {item.badge.slice(0, 4)}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] leading-snug text-foreground/95">{item.headline}</p>
        <span className="text-[10.5px] text-muted-foreground mt-1 block">
          {item.badge} · {item.recency}
        </span>
      </div>
    </div>
  );
}