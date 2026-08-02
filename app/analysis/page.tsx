"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
  CartesianGrid,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";

type Candle = { date: string; timestamp: number; close: number };

type AnalysisData = {
  bars: number;
  latest: {
    adx: number | null;
    aroonUp: number | null;
    aroonDown: number | null;
    stochK: number | null;
    stochD: number | null;
    williams: number | null;
    cci: number | null;
    mfi: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    bbMiddle: number | null;
    bbWidth: number | null;
    atr: number | null;
    atrPct: number | null;
    keltnerUpper: number | null;
    keltnerLower: number | null;
    obv: number | null;
    obvSlope: number | null;
    cmf: number | null;
    vwap: number | null;
    hurst: number;
    zScore: number | null;
    maxDrawdown: number;
    sharpe: number;
    sortino: number;
    var95: number;
    cvar95: number;
    volatility: number | null;
  };
};

const RANGES = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "2Y", label: "2Y" },
] as const;

type Range = typeof RANGES[number]["value"];

type Group = "trend" | "momentum" | "volatility" | "volume" | "fractal" | "risk";

const GROUPS: { value: Group; label: string }[] = [
  { value: "trend", label: "Tendência" },
  { value: "momentum", label: "Momentum" },
  { value: "volatility", label: "Volatilidade" },
  { value: "volume", label: "Volume" },
  { value: "fractal", label: "Fractal" },
  { value: "risk", label: "Risco" },
];

// Toggle visibility per indicator
type ToggleState = Record<string, boolean>;

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group>("trend");
  const [range, setRange] = useState<Range>("1Y");

  // Toggles — todos default OFF conforme regra
  const [toggles, setToggles] = useState<ToggleState>({
    price: true, // preço sempre visivel (é o gráfico principal)
    sma20: false,
    sma50: false,
    bb: false,
    keltner: false,
    rsi: false,
    stoch: false,
    obv: false,
    vwap: false,
  });

  const loadTicker = async (sym: string) => {
    const upper = sym.toUpperCase().trim();
    if (!upper) return;
    setTicker(upper);
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/analysis/${encodeURIComponent(upper)}`);
      const d = await r.json();
      if (d.error) setError(d.error);
      else setData(d.analysis);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) =>
    setToggles((t) => ({ ...t, [key]: !t[key] }));

  // Price chart com SMA20/50 e BB/Keltner toggles
  const { priceSeries } = useChartData(ticker, range);

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Analysis</h1>
        <p className="text-sm text-text-secondary">
          Análise técnica profunda. Toggle nos indicadores para customizar o gráfico.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); loadTicker(input); }}
        className="relative mb-6 max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Ticker (ex: AAPL)"
          className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-foreground/30"
        />
      </form>

      {ticker && (
        <div className="mb-4">
          <Link href={`/asset/${ticker}`} className="text-xs text-text-muted hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Voltar pra {ticker}
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Calculando indicadores avançados (1Y de candles)...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-negative/30 bg-negative/5 p-6 text-negative text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* CHART com toggles */}
          {priceSeries.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-medium">{ticker} — Price</div>
                  <div className="text-xs text-text-muted">Range: {range}</div>
                </div>
                <div className="flex gap-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded transition-colors",
                        range === r.value
                          ? "bg-foreground text-background"
                          : "bg-surface-elevated text-text-secondary hover:text-foreground",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <Chart
                series={priceSeries}
                showPrice={toggles.price}
                showSMA20={toggles.sma20}
                showSMA50={toggles.sma50}
                showBB={toggles.bb}
                showKeltner={toggles.keltner}
              />
              {/* Toggle bar */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-subtle">
                <ToggleBtn label="Preço" checked={toggles.price} onChange={() => toggle("price")} color="bg-foreground" />
                <ToggleBtn label="SMA 20" checked={toggles.sma20} onChange={() => toggle("sma20")} color="bg-yellow-400" />
                <ToggleBtn label="SMA 50" checked={toggles.sma50} onChange={() => toggle("sma50")} color="bg-violet-400" />
                <ToggleBtn label="Bollinger" checked={toggles.bb} onChange={() => toggle("bb")} color="bg-blue-400" />
                <ToggleBtn label="Keltner" checked={toggles.keltner} onChange={() => toggle("keltner")} color="bg-amber-400" />
              </div>
            </div>
          )}

          {/* Toggle group nav */}
          <div className="flex items-center gap-1 mb-4 bg-surface border border-border rounded-md p-0.5 w-fit overflow-x-auto">
            {GROUPS.map((g) => (
              <button
                key={g.value}
                onClick={() => setActiveGroup(g.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                  activeGroup === g.value
                    ? "bg-foreground text-background"
                    : "text-text-secondary hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            {activeGroup === "trend" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="ADX (Average Directional Index)"
                  formula="ADX = SMA(14) de |+DI - -DI| / (+DI + -DI) × 100"
                  rangeGuide={[
                    { label: "0–20", meaning: "Sem tendência definida. Mercado lateral ou fraco.", tone: "neutral" },
                    { label: "20–25", meaning: "Tendência fraca começando. Pode entrar/sair do range.", tone: "neutral" },
                    { label: "25–50", meaning: "Tendência forte estabelecida. Operar a favor.", tone: "positive" },
                    { label: "50–75", meaning: "Tendência muito forte. Cuidado com exaustão.", tone: "positive" },
                    { label: "75+", meaning: "Tendência extrema. Risco de reversão iminente.", tone: "negative" },
                  ]}
                  value={data.latest.adx}
                />
                <DetailedIndicator
                  name="Aroon (Up / Down)"
                  formula="Aroon Up = (períodos desde máxima / período) × 100; Aroon Down = análogo para mínima"
                  rangeGuide={[
                    { label: "Aroon Up > 70", meaning: "Tendência de ALTA forte. Máxima recente.", tone: "positive" },
                    { label: "Aroon Down > 70", meaning: "Tendência de BAIXA forte. Mínima recente.", tone: "negative" },
                    { label: "Ambos < 30", meaning: "Sem direção. Mercado em consolidação.", tone: "neutral" },
                  ]}
                  value={`Up ${data.latest.aroonUp?.toFixed(0) ?? "—"} / Down ${data.latest.aroonDown?.toFixed(0) ?? "—"}`}
                />
              </div>
            )}

            {activeGroup === "momentum" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="Stochastic Oscillator (%K, %D)"
                  formula="%K = (close - min14) / (max14 - min14) × 100; %D = SMA(3) de %K"
                  rangeGuide={[
                    { label: "%K > 80", meaning: "Sobrecomprado. Possível correção.", tone: "negative" },
                    { label: "%K 20–80", meaning: "Zona neutra.", tone: "neutral" },
                    { label: "%K < 20", meaning: "Sobrevendido. Possível repique.", tone: "positive" },
                    { label: "%K cruza %D pra cima", meaning: "Sinal de compra.", tone: "positive" },
                    { label: "%K cruza %D pra baixo", meaning: "Sinal de venda.", tone: "negative" },
                  ]}
                  value={`%K ${data.latest.stochK?.toFixed(1) ?? "—"} / %D ${data.latest.stochD?.toFixed(1) ?? "—"}`}
                />
                <DetailedIndicator
                  name="Williams %R"
                  formula="%R = (high14 - close) / (high14 - low14) × -100"
                  rangeGuide={[
                    { label: "%R > -20", meaning: "Sobrecomprado. Início de correção.", tone: "negative" },
                    { label: "%R -20 a -80", meaning: "Neutro.", tone: "neutral" },
                    { label: "%R < -80", meaning: "Sobrevendido. Possível fundo.", tone: "positive" },
                  ]}
                  value={data.latest.williams?.toFixed(1) ?? null}
                />
                <DetailedIndicator
                  name="CCI (Commodity Channel Index)"
                  formula="CCI = (TP - SMA20) / (0.015 × desvio médio)"
                  rangeGuide={[
                    { label: "CCI > +100", meaning: "Forte ALTA. Tendência sustentável.", tone: "positive" },
                    { label: "CCI -100 a +100", meaning: "Mercado lateral / fraco.", tone: "neutral" },
                    { label: "CCI < -100", meaning: "Forte BAIXA. Possível continuação.", tone: "negative" },
                  ]}
                  value={data.latest.cci?.toFixed(1) ?? null}
                />
                <DetailedIndicator
                  name="MFI (Money Flow Index)"
                  formula="MFI = 100 - 100 / (1 + Money Ratio)"
                  rangeGuide={[
                    { label: "MFI > 80", meaning: "Sobrecomprado por fluxo. Distribuição possível.", tone: "negative" },
                    { label: "MFI 20–80", meaning: "Fluxo neutro.", tone: "neutral" },
                    { label: "MFI < 20", meaning: "Sobrevendido por fluxo. Acumulação possível.", tone: "positive" },
                  ]}
                  value={data.latest.mfi?.toFixed(1) ?? null}
                />
              </div>
            )}

            {activeGroup === "volatility" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="Bollinger Bands"
                  formula="Upper/Lower = SMA20 ± 2×σ20; Width = (Upper - Lower) / Middle × 100"
                  rangeGuide={[
                    { label: "Preço toca banda superior", meaning: "Possível resistência / reversão de curto prazo.", tone: "negative" },
                    { label: "Preço toca banda inferior", meaning: "Possível suporte / continuação (com confirmação).", tone: "positive" },
                    { label: "Bandwidth < 5%", meaning: "Squeeze. Expansão de volatilidade iminente.", tone: "neutral" },
                    { label: "Bandwidth > 15%", meaning: "Alta volatilidade. Risco elevado.", tone: "neutral" },
                    { label: "Bandwidth > 20%", meaning: "Volatilidade extrema. Possível reversão.", tone: "negative" },
                  ]}
                  value={`Upper ${data.latest.bbUpper?.toFixed(2) ?? "—"} / Mid ${data.latest.bbMiddle?.toFixed(2) ?? "—"} / Lower ${data.latest.bbLower?.toFixed(2) ?? "—"}`}
                  extra={`Bandwidth: ${data.latest.bbWidth?.toFixed(2) ?? "—"}%`}
                />
                <DetailedIndicator
                  name="ATR (Average True Range, 14d)"
                  formula="ATR = SMA(14) de True Range"
                  rangeGuide={[
                    { label: "ATR / Preço < 2%", meaning: "Baixa volatilidade. Range diário apertado.", tone: "neutral" },
                    { label: "ATR / Preço 2-4%", meaning: "Volatilidade média. Típico de blue chips.", tone: "neutral" },
                    { label: "ATR / Preço > 5%", meaning: "Alta volatilidade. Risco elevado.", tone: "negative" },
                    { label: "ATR / Preço > 8%", meaning: "Especulativo (penny stocks, crypto).", tone: "negative" },
                  ]}
                  value={data.latest.atr?.toFixed(2) ?? null}
                  extra={`${data.latest.atrPct?.toFixed(2) ?? "—"}% do preço`}
                />
                <DetailedIndicator
                  name="Volatilidade Anualizada"
                  formula="σ_anual = σ_diária × √252"
                  rangeGuide={[
                    { label: "< 15%", meaning: "Muito baixa (bonds, utilities).", tone: "neutral" },
                    { label: "15–25%", meaning: "Típica de blue chips.", tone: "neutral" },
                    { label: "25–40%", meaning: "Alta (small caps, growth).", tone: "negative" },
                    { label: "> 40%", meaning: "Especulativa (crypto, biotech).", tone: "negative" },
                  ]}
                  value={data.latest.volatility != null ? `${data.latest.volatility.toFixed(1)}%` : null}
                />
              </div>
            )}

            {activeGroup === "volume" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="OBV (On-Balance Volume)"
                  formula="OBV += volume se close subiu, -= volume se caiu"
                  rangeGuide={[
                    { label: "OBV subindo + preço lateral", meaning: "Acumulação. Possível breakout pra cima.", tone: "positive" },
                    { label: "OBV caindo + preço lateral", meaning: "Distribuição. Possível breakdown pra baixo.", tone: "negative" },
                    { label: "OBV confirmando novos topos", meaning: "Tendência saudável.", tone: "positive" },
                    { label: "OBV divergindo do preço", meaning: "Fraqueza subjacente. Cuidado.", tone: "negative" },
                  ]}
                  value={data.latest.obv?.toLocaleString() ?? null}
                  extra={`Slope 5d: ${data.latest.obvSlope?.toLocaleString() ?? "—"}`}
                />
                <DetailedIndicator
                  name="CMF (Chaikin Money Flow, 20d)"
                  formula="CMF = sum(MFV, 20) / sum(volume, 20), MFV = ((close-low)-(high-close))/(high-low) × volume"
                  rangeGuide={[
                    { label: "CMF > +0.05", meaning: "Pressão compradora. Acumulação.", tone: "positive" },
                    { label: "CMF -0.05 a +0.05", meaning: "Neutro.", tone: "neutral" },
                    { label: "CMF < -0.05", meaning: "Pressão vendedora. Distribuição.", tone: "negative" },
                  ]}
                  value={data.latest.cmf?.toFixed(3) ?? null}
                />
                <DetailedIndicator
                  name="VWAP (Volume-Weighted Avg Price)"
                  formula="VWAP cumulativo = Σ(P×V) / Σ(V)"
                  rangeGuide={[
                    { label: "Preço > VWAP", meaning: "Compradores no controle.", tone: "positive" },
                    { label: "Preço < VWAP", meaning: "Vendedores no controle.", tone: "negative" },
                    { label: "Preço cruza VWAP pra cima", meaning: "Sinal de continuação de alta.", tone: "positive" },
                    { label: "Preço cruza VWAP pra baixo", meaning: "Sinal de continuação de baixa.", tone: "negative" },
                  ]}
                  value={data.latest.vwap?.toFixed(2) ?? null}
                />
              </div>
            )}

            {activeGroup === "fractal" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="Hurst Exponent (R/S method)"
                  formula="H via regressão log-log de R/S vs lag"
                  rangeGuide={[
                    { label: "H < 0.45", meaning: "Mean-reverting (anti-persistente). Reversão à média favorecida.", tone: "negative" },
                    { label: "H ≈ 0.50", meaning: "Random walk. Sem memória. Mercado eficiente.", tone: "neutral" },
                    { label: "H 0.50–0.65", meaning: "Trending persistente. Momentum funciona.", tone: "positive" },
                    { label: "H > 0.70", meaning: "Forte trending / persistente. Risco de bolha.", tone: "positive" },
                  ]}
                  value={data.latest.hurst.toFixed(3)}
                />
                <DetailedIndicator
                  name="Z-Score (rolling 20d)"
                  formula="Z = (price - SMA20) / σ20"
                  rangeGuide={[
                    { label: "|Z| < 1", meaning: "Preço dentro do range normal.", tone: "neutral" },
                    { label: "1 ≤ |Z| < 2", meaning: "Desvio moderado. Possível continuação.", tone: "neutral" },
                    { label: "|Z| ≥ 2", meaning: "Desvio significativo (~5% das vezes). Mean-reversion provável.", tone: "negative" },
                  ]}
                  value={data.latest.zScore?.toFixed(2) ?? null}
                />
              </div>
            )}

            {activeGroup === "risk" && (
              <div className="space-y-5">
                <DetailedIndicator
                  name="Sharpe Ratio (anualizado)"
                  formula="Sharpe = μ_r / σ_r × √252"
                  rangeGuide={[
                    { label: "Sharpe < 0", meaning: "Performance pior que sem risco. Evitar.", tone: "negative" },
                    { label: "0 a 1", meaning: "Aceitável. Compensa pelo risco.", tone: "neutral" },
                    { label: "1 a 2", meaning: "Bom.", tone: "positive" },
                    { label: "2 a 3", meaning: "Muito bom. Referência para hedge funds.", tone: "positive" },
                    { label: "> 3", meaning: "Excelente. Suspeito — verificar se está inflado.", tone: "positive" },
                  ]}
                  value={data.latest.sharpe.toFixed(2)}
                />
                <DetailedIndicator
                  name="Sortino Ratio"
                  formula="Sortino = μ_r / σ_downside × √252"
                  rangeGuide={[
                    { label: "Sortino < 0", meaning: "Performance negativa. Evitar.", tone: "negative" },
                    { label: "0 a 1", meaning: "OK mas com drawdowns significativos.", tone: "neutral" },
                    { label: "1 a 2", meaning: "Bom. Melhor que Sharpe pra assets assimétricos.", tone: "positive" },
                    { label: "> 2", meaning: "Excelente risco-retorno.", tone: "positive" },
                  ]}
                  value={data.latest.sortino.toFixed(2)}
                />
                <DetailedIndicator
                  name="Maximum Drawdown"
                  formula="MDD = max((peak - trough) / peak) no período"
                  rangeGuide={[
                    { label: "MDD < 10%", meaning: "Baixo risco. Tendência saudável.", tone: "positive" },
                    { label: "MDD 10-20%", meaning: "Moderado. Normal pra ações.", tone: "neutral" },
                    { label: "MDD 20-35%", meaning: "Alto. Bear market típico.", tone: "negative" },
                    { label: "MDD > 50%", meaning: "Crise extrema. Recovery longo esperado.", tone: "negative" },
                  ]}
                  value={data.latest.maxDrawdown != null ? `${data.latest.maxDrawdown.toFixed(1)}%` : null}
                />
                <DetailedIndicator
                  name="Value at Risk (95%, 1 dia)"
                  formula="VaR95 = -quantile(5%) dos retornos diários"
                  rangeGuide={[
                    { label: "VaR < 1%", meaning: "Ativo de baixo risco.", tone: "positive" },
                    { label: "VaR 1-2%", meaning: "Risco moderado. Blue chips.", tone: "neutral" },
                    { label: "VaR 2-3%", meaning: "Risco elevado.", tone: "negative" },
                    { label: "VaR > 5%", meaning: "Muito arriscado. Crypto / small caps.", tone: "negative" },
                  ]}
                  value={data.latest.var95 != null ? `${data.latest.var95.toFixed(2)}%` : null}
                />
                <DetailedIndicator
                  name="Conditional VaR (95%)"
                  formula="CVaR95 = E[loss | loss > VaR95]"
                  rangeGuide={[
                    { label: "CVaR < 2%", meaning: "Cauda controlada.", tone: "positive" },
                    { label: "CVaR 2-4%", meaning: "Risco de cauda moderado.", tone: "neutral" },
                    { label: "CVaR > 5%", meaning: "Risco de cauda severo.", tone: "negative" },
                  ]}
                  value={data.latest.cvar95 != null ? `${data.latest.cvar95.toFixed(2)}%` : null}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ToggleBtn({ label, checked, onChange, color }: { label: string; checked: boolean; onChange: () => void; color: string }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors border",
        checked
          ? "border-foreground text-foreground bg-surface-elevated"
          : "border-border text-text-muted hover:text-foreground",
      )}
    >
      {checked ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      <span className={`w-3 h-0.5 ${color}`} />
      {label}
    </button>
  );
}

function DetailedIndicator({
  name,
  formula,
  rangeGuide,
  value,
  extra,
}: {
  name: string;
  formula: string;
  rangeGuide: { label: string; meaning: string; tone: "positive" | "negative" | "neutral" }[];
  value: string | number | null;
  extra?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-l-2 border-border-subtle pl-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-medium text-foreground text-sm">{name}</h3>
        <span className="font-mono font-semibold tabular-nums text-sm">
          {value == null ? "—" : String(value)}
          {extra && <span className="ml-2 text-xs text-text-muted font-normal">{extra}</span>}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-1">{formula}</p>

      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-accent hover:underline mt-1"
      >
        {open ? "▾ Ocultar interpretação" : "▸ O que significa cada valor?"}
      </button>

      {open && (
        <div className="mt-3 space-y-1.5 bg-surface-elevated/40 rounded-md p-3">
          {rangeGuide.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {r.tone === "positive" && <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0 mt-0.5" />}
              {r.tone === "negative" && <XCircle className="w-3.5 h-3.5 text-negative shrink-0 mt-0.5" />}
              {r.tone === "neutral" && <AlertCircle className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-mono text-text-foreground">{r.label}</span>
                <span className="text-text-muted"> — {r.meaning}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chart({
  series,
  showPrice,
  showSMA20,
  showSMA50,
  showBB,
  showKeltner,
}: {
  series: Candle[];
  showPrice: boolean;
  showSMA20: boolean;
  showSMA50: boolean;
  showBB: boolean;
  showKeltner: boolean;
}) {
  // Calcular SMA e Bollinger localmente
  const enriched = useMemo(() => {
    const closes = series.map((c) => c.close);
    const sma20 = calcMA(closes, 20);
    const sma50 = calcMA(closes, 50);
    const bb = calcBB(closes, 20, 2);
    const keltner = calcKeltner(closes, 20, 2); // simplificado, sem ATR
    return series.map((p, i) => ({
      ...p,
      sma20: sma20[i],
      sma50: sma50[i],
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      bbMiddle: bb.middle[i],
      keltnerUpper: keltner.upper[i],
      keltnerLower: keltner.lower[i],
    }));
  }, [series]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={enriched}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} minTickGap={50} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => `$${v.toFixed(0)}`} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
            padding: "8px 12px",
          }}
          formatter={(v) => `$${Number(v).toFixed(2)}`}
        />
        {showKeltner && (
          <>
            <Line type="monotone" dataKey="keltnerUpper" stroke="#fbbf24" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Keltner Upper" />
            <Line type="monotone" dataKey="keltnerLower" stroke="#fbbf24" strokeWidth={1} dot={false} strokeDasharray="2 2" name="Keltner Lower" />
          </>
        )}
        {showBB && (
          <>
            <Line type="monotone" dataKey="bbUpper" stroke="#60a5fa" strokeWidth={1} dot={false} name="BB Upper" />
            <Line type="monotone" dataKey="bbLower" stroke="#60a5fa" strokeWidth={1} dot={false} name="BB Lower" />
          </>
        )}
        {showSMA50 && <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="SMA 50" />}
        {showSMA20 && <Line type="monotone" dataKey="sma20" stroke="#fbbf24" strokeWidth={1.5} dot={false} name="SMA 20" />}
        {showPrice && (
          <Area
            type="monotone"
            dataKey="close"
            stroke="#ededed"
            strokeWidth={1.5}
            fill="url(#priceGrad)"
            isAnimationActive={false}
            name="Preço"
          />
        )}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ededed" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#ededed" stopOpacity={0} />
          </linearGradient>
        </defs>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function calcMA(prices: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      out.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      out.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return out;
}

function calcBB(prices: number[], period: number, stdDev: number) {
  const ma = calcMA(prices, period);
  const upper: (number | null)[] = [];
  const middle = ma;
  const lower: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (ma[i] == null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = ma[i]!;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  return { upper, middle, lower };
}

function calcKeltner(prices: number[], period: number, multiplier: number) {
  // Simplified Keltner — sem ATR (usa stdDev como proxy)
  const ma = calcMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (ma[i] == null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = ma[i]!;
      const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
      upper.push(mean + multiplier * std);
      lower.push(mean - multiplier * std);
    }
  }
  return { upper, middle: ma, lower };
}

function useChartData(ticker: string, range: Range) {
  const [series, setSeries] = useState<Candle[]>([]);
  useEffect(() => {
    if (!ticker) return;
    fetch(`/api/chart/${ticker}?range=${range}`)
      .then((r) => r.json())
      .then((d) => setSeries((d.points ?? []) as Candle[]))
      .catch(() => setSeries([]));
  }, [ticker, range]);
  return { priceSeries: series };
}
