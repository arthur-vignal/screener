"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { cn, formatPercent } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrapiQuoteBatch } from "@/lib/brapi-quote-batch";

type Quote = {
  symbol: string;
  price: number | null;
};

type Strategy = "long_call" | "long_put" | "covered_call" | "straddle" | "collar";

// Payoff at expiry, given spot at expiry. Inputs are per-share.
function payoffAtExpiry(strategy: Strategy, spot: number, strike: number, premium: number): number {
  const callPayoff = (s: number) => Math.max(0, s - strike) - premium;
  const putPayoff = (s: number) => Math.max(0, strike - s) - premium;
  switch (strategy) {
    case "long_call":
      return callPayoff(spot);
    case "long_put":
      return putPayoff(spot);
    case "covered_call":
      // Own 100 shares + sell call strike K premium p.
      return spot - 100 * premium + Math.max(0, premium - Math.max(0, spot - strike));
    case "straddle":
      // Buy call + put same strike.
      return callPayoff(spot) + putPayoff(spot);
    case "collar":
      // Own shares + sell call (premium p1) + buy put (premium p2).
      // Simplified: assume net premium 0.
      const soldCall = Math.max(0, spot - strike) - premium; // -ve
      const boughtPut = Math.max(0, strike - spot) - premium; // -ve
      return spot - 100 * 0 + soldCall + boughtPut;
  }
}

// Black-Scholes simplified (no IV input — uses 30% placeholder).
function bsPrice(spot: number, strike: number, t: number, iv: number, type: "call" | "put"): number {
  // d1 and d2
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (0.5 * iv * iv) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const cdf = (x: number) => 0.5 * (1 + erf(x / Math.sqrt(2)));
  if (type === "call") {
    return spot * cdf(d1) - strike * cdf(d2);
  } else {
    return strike * cdf(-d2) - spot * cdf(-d1);
  }
}

function erf(x: number): number {
  // Abramowitz & Stegun approximation.
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

// Approximate Greeks (delta, gamma, theta, vega) at-the-money.
function approxGreeks(spot: number, strike: number, iv: number, type: "call" | "put") {
  const d1 = (Math.log(spot / strike) + (0.5 * iv * iv)) / iv;
  const cdf = (x: number) => 0.5 * (1 + erf(x / Math.sqrt(2)));
  const pdf = (x: number) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const delta = type === "call" ? cdf(d1) : cdf(d1) - 1;
  const gamma = pdf(d1) / (spot * iv);
  const theta = -spot * pdf(d1) * iv / (2 * Math.sqrt(2 * Math.PI)) / 365;
  const vega = spot * pdf(d1) / 100;
  return { delta, gamma, theta, vega };
}

const STRATEGIES: Array<{ key: Strategy; label: string; description: string }> = [
  { key: "long_call", label: "Long Call", description: "Compra de call ATM" },
  { key: "long_put", label: "Long Put", description: "Compra de put ATM" },
  { key: "covered_call", label: "Covered Call", description: "100 ações + venda de call OTM" },
  { key: "straddle", label: "Straddle", description: "Call + Put mesmo strike (ATM)" },
  { key: "collar", label: "Collar", description: "Long Stock + Long Put OTM + Short Call OTM" },
];

export default function OptionsPage() {
  return (
    <Suspense fallback={<OptionsFallback />}>
      <OptionsInner />
    </Suspense>
  );
}

function OptionsFallback() {
  return (
    <div className="px-3 md:px-4 py-3 md:py-4 max-w-[1920px]">
      <div className="label-s label-muted-2 mb-3">Carregando…</div>
      <Skeleton className="h-72" />
    </div>
  );
}

function OptionsInner() {
  const [ticker, setTicker] = useState("PETR4");
  const [strategy, setStrategy] = useState<Strategy>("long_call");
  const [spot, setSpot] = useState(40);
  const [strike, setStrike] = useState(42);
  const [premium, setPremium] = useState(1.2);
  const [tickerPrice, setTickerPrice] = useState<number | null>(null);

  useEffect(() => {
    getBrapiQuoteBatch([ticker.toUpperCase()])
      .then((map) => {
        const q = map.get(ticker.toUpperCase());
        const p = q?.price;
        if (p != null && p > 0) {
          setSpot(p);
          setTickerPrice(p);
          setStrike(Number((p * 1.05).toFixed(2)));
        } else {
          setTickerPrice(null);
        }
      })
      .catch(() => setTickerPrice(null));
  }, [ticker]);

  const points = useMemo(() => {
    const min = spot * 0.7;
    const max = spot * 1.3;
    const step = (max - min) / 60;
    const pts: Array<{ s: number; p: number }> = [];
    for (let s = min; s <= max; s += step) {
      pts.push({ s: Number(s.toFixed(2)), p: payoffAtExpiry(strategy, s, strike, premium) });
    }
    return pts;
  }, [spot, strike, premium, strategy]);

  const iv = 0.3; // 30% placeholder
  const callGreeks = approxGreeks(spot, strike, iv, "call");
  const putGreeks = approxGreeks(spot, strike, iv, "put");
  const callPremium = bsPrice(spot, strike, 0.08, iv, "call"); // ~1 month
  const putPremium = bsPrice(spot, strike, 0.08, iv, "put");

  const breakEven = (() => {
    switch (strategy) {
      case "long_call":
        return strike + premium;
      case "long_put":
        return strike - premium;
      case "covered_call":
        return premium; // already at premium income
      case "straddle":
        return { low: strike - premium, high: strike + premium };
      case "collar":
        return premium;
    }
  })();

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
            Opções — Payoff + Gregas
          </h1>
          <p className="text-body text-sm mt-1 max-w-2xl">
            Simulador de estratégias de opções para ações BR. Gregas e
            precificação via Black-Scholes com IV placeholder de 30% (Brapi
            Pro não expõe a IV surface via endpoint público; logo, smile/skew
            3D e ranking IV rank ficam pendentes de feed real).
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Field label="Ativo">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
          />
        </Field>
        <Field label="Spot (R$)">
          <input
            type="number"
            step="0.01"
            value={spot}
            onChange={(e) => setSpot(Number(e.target.value))}
            className="w-full h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
          />
          {tickerPrice != null && (
            <div className="text-[10.5px] text-faint mt-0.5">
              Mercado: R${tickerPrice.toFixed(2)}
            </div>
          )}
        </Field>
        <Field label="Strike (R$)">
          <input
            type="number"
            step="0.01"
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
            className="w-full h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
          />
        </Field>
        <Field label="Prêmio (R$)">
          <input
            type="number"
            step="0.01"
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value))}
            className="w-full h-7 px-2 border border-hairline-strong bg-canvas num text-[12px]"
          />
          <div className="text-[10.5px] text-faint mt-0.5">
            BS ATM: call R${callPremium.toFixed(2)} / put R${putPremium.toFixed(2)}
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-wrap">
        <BarChart3 className="w-4 h-4 text-muted shrink-0" />
        {STRATEGIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStrategy(s.key)}
            className={cn(
              "label-s border px-3 py-1 press whitespace-nowrap",
              strategy === s.key
                ? "border-ink text-ink bg-surface-elevated"
                : "border-hairline-strong text-muted hover:text-ink",
            )}
            title={s.description}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Payoff chart (custom SVG) */}
      <div className="border border-hairline-strong bg-canvas-soft p-4 mb-4">
        <h2 className="font-display text-[16px] text-ink mb-2">
          Payoff a expiração
        </h2>
        <PayoffChart points={points} spot={spot} strike={strike} premium={premium} />
        <div className="text-[10.5px] text-muted mt-2">
          Break-even:{" "}
          {typeof breakEven === "number"
            ? `R$ ${breakEven.toFixed(2)}`
            : `R$ ${breakEven.low.toFixed(2)} / R$ ${breakEven.high.toFixed(2)}`}
        </div>
      </div>

      {/* Greeks table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-hairline-strong bg-surface-elevated p-3">
          <h3 className="font-display text-[14px] text-ink mb-2">Call ATM (BS)</h3>
          <GreekRow label="Delta" value={callGreeks.delta.toFixed(3)} />
          <GreekRow label="Gamma" value={callGreeks.gamma.toFixed(4)} />
          <GreekRow label="Theta (diário)" value={callGreeks.theta.toFixed(4)} />
          <GreekRow label="Vega (+1pp IV)" value={callGreeks.vega.toFixed(4)} />
        </div>
        <div className="border border-hairline-strong bg-surface-elevated p-3">
          <h3 className="font-display text-[14px] text-ink mb-2">Put ATM (BS)</h3>
          <GreekRow label="Delta" value={putGreeks.delta.toFixed(3)} />
          <GreekRow label="Gamma" value={putGreeks.gamma.toFixed(4)} />
          <GreekRow label="Theta (diário)" value={putGreeks.theta.toFixed(4)} />
          <GreekRow label="Vega (+1pp IV)" value={putGreeks.vega.toFixed(4)} />
        </div>
      </div>

      <div className="mt-4 p-3 border border-hairline-strong text-[11.5px] text-muted leading-relaxed">
        <strong className="text-ink">Limitação:</strong> Brapi Pro não
        expõe IV surface via endpoint público (anti-bot). O smile 3D e o
        ranking IV rank ficam pendentes até um feed real de IV ser conectado.
        Aqui usamos Black-Scholes com IV placeholder de 30%.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-s label-muted-2 mb-1">{label}</div>
      {children}
    </div>
  );
}

function GreekRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[11.5px]">
      <span className="text-muted">{label}</span>
      <span className="num text-ink">{value}</span>
    </div>
  );
}

function PayoffChart({
  points,
  spot,
  strike,
  premium,
}: {
  points: Array<{ s: number; p: number }>;
  spot: number;
  strike: number;
  premium: number;
}) {
  const w = 800;
  const h = 240;
  if (points.length === 0) return null;
  const minS = Math.min(...points.map((p) => p.s));
  const maxS = Math.max(...points.map((p) => p.s));
  const minP = Math.min(...points.map((p) => p.p), 0);
  const maxP = Math.max(...points.map((p) => p.p), 0);
  const rangeS = maxS - minS || 1;
  const rangeP = maxP - minP || 1;
  const pad = rangeP * 0.1;
  const yMin = minP - pad;
  const yMax = maxP + pad;

  const toX = (s: number) => ((s - minS) / rangeS) * (w - 60) + 50;
  const toY = (p: number) => h - 20 - ((p - yMin) / (yMax - yMin)) * (h - 40);
  const zeroY = toY(0);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.s).toFixed(1)},${toY(p.p).toFixed(1)}`)
    .join(" ");

  // Find break-even via interpolation
  const positive = points.find((p, i) => i > 0 && points[i - 1].p < 0 && p.p >= 0);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Zero line */}
        <line
          x1="0"
          y1={zeroY}
          x2={w}
          y2={zeroY}
          stroke="var(--hairline-strong)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        {/* Strike marker */}
        <line
          x1={toX(strike)}
          y1="0"
          x2={toX(strike)}
          y2={h}
          stroke="var(--brand-deep)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Spot marker */}
        <line
          x1={toX(spot)}
          y1="0"
          x2={toX(spot)}
          y2={h}
          stroke="var(--positive)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        {/* Payoff line */}
        <path
          d={linePath}
          stroke="var(--ink)"
          strokeWidth="1.5"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {/* Axes labels */}
        <text
          x={toX(strike)}
          y="14"
          fill="var(--brand-deep)"
          fontSize="9"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          K={strike.toFixed(2)}
        </text>
        <text
          x={toX(spot)}
          y="14"
          fill="var(--positive)"
          fontSize="9"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          S={spot.toFixed(2)}
        </text>
        <text
          x="6"
          y={toY(yMax)}
          fill="var(--faint)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          {yMax.toFixed(2)}
        </text>
        <text
          x="6"
          y={toY(yMin) + 6}
          fill="var(--faint)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          {yMin.toFixed(2)}
        </text>
        <text
          x="6"
          y={zeroY + 4}
          fill="var(--muted)"
          fontSize="9"
          fontFamily="var(--font-mono)"
        >
          0
        </text>
      </svg>
    </div>
  );
}
