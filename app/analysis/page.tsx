"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, ArrowLeft, TrendingUp, Activity, BarChart3, AlertTriangle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";


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

type Group = "trend" | "momentum" | "volatility" | "volume" | "fractal" | "risk";

const GROUPS: { value: Group; label: string; icon: typeof Activity }[] = [
  { value: "trend", label: "Tendência", icon: TrendingUp },
  { value: "momentum", label: "Momentum", icon: Activity },
  { value: "volatility", label: "Volatilidade", icon: BarChart3 },
  { value: "volume", label: "Volume", icon: Layers },
  { value: "fractal", label: "Fractal", icon: AlertTriangle },
  { value: "risk", label: "Risco", icon: AlertTriangle },
];

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group>("trend");

  // Nota: ticker só é setado quando o usuário submete (não em effect).
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

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Analysis</h1>
        <p className="text-sm text-text-secondary">
          Análise técnica profunda com indicadores avançados (ADX, Hurst, OBV, BB, etc).
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); loadTicker(input); }}
        className="relative mb-6 max-w-md"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
          Carregando análise profunda...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-negative/30 bg-negative/5 p-6 text-negative text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex items-center gap-2 mb-4 bg-surface border border-border rounded-md p-0.5 w-fit overflow-x-auto">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              return (
                <button
                  key={g.value}
                  onClick={() => setActiveGroup(g.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                    activeGroup === g.value
                      ? "bg-foreground text-background"
                      : "text-text-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {g.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            {activeGroup === "trend" && (
              <div className="space-y-4">
                <Indicator
                  name="ADX (Average Directional Index)"
                  formula="ADX = avg(14) of |+DI - -DI| / (+DI + -DI) × 100"
                  description="Mede a força da tendência. >25 = tendência forte, <20 = fraca/sem tendência."
                  value={data.latest.adx}
                  interpretation={interpADX(data.latest.adx)}
                />
                <Indicator
                  name="Aroon Up / Down"
                  formula="Aroon Up = (periods since 1-period high / period) × 100"
                  description="Identifica se o ativo está em tendência de alta ou baixa."
                  value={`${(data.latest.aroonUp ?? 0).toFixed(0)} / ${(data.latest.aroonDown ?? 0).toFixed(0)}`}
                  interpretation={interpAroon(data.latest.aroonUp ?? 0, data.latest.aroonDown ?? 0)}
                />
              </div>
            )}

            {activeGroup === "momentum" && (
              <div className="space-y-4">
                <Indicator
                  name="Stochastic Oscillator (%K, %D)"
                  formula="%K = (close - low14) / (high14 - low14) × 100; %D = SMA(3) de %K"
                  description="Momentum de curto prazo. >80 = sobrecomprado, <20 = sobrevendido."
                  value={`${(data.latest.stochK ?? 0).toFixed(1)} / ${(data.latest.stochD ?? 0).toFixed(1)}`}
                  interpretation={interpStochastic(data.latest.stochK ?? 0)}
                />
                <Indicator
                  name="Williams %R"
                  formula="%R = (high14 - close) / (high14 - low14) × -100"
                  description="Similar ao Stochastic invertido. >-20 = sobrecomprado, <-80 = sobrevendido."
                  value={data.latest.williams}
                  interpretation={interpWilliams(data.latest.williams ?? 0)}
                />
                <Indicator
                  name="CCI (Commodity Channel Index)"
                  formula="CCI = (TP - SMA20) / (0.015 × mean deviation)"
                  description="Desvios da média. >100 = forte alta, <-100 = forte baixa."
                  value={data.latest.cci}
                  interpretation={interpCCI(data.latest.cci ?? 0)}
                />
                <Indicator
                  name="MFI (Money Flow Index)"
                  formula="MFI = 100 - 100 / (1 + Money Ratio)"
                  description="Volume-weighted RSI. >80 = sobrecomprado, <20 = sobrevendido."
                  value={data.latest.mfi}
                  interpretation={interpMFI(data.latest.mfi ?? 0)}
                />
              </div>
            )}

            {activeGroup === "volatility" && (
              <div className="space-y-4">
                <Indicator
                  name="Bollinger Bands"
                  formula="Upper/Lower = SMA20 ± 2σ"
                  description="Bandas de volatilidade. Preço toca banda superior = possível reversão; banda inferior = possível continuação (com confirmação)."
                  value={`${(data.latest.bbUpper ?? 0).toFixed(2)} / ${(data.latest.bbMiddle ?? 0).toFixed(2)} / ${(data.latest.bbLower ?? 0).toFixed(2)}`}
                  extra={`Largura: ${(data.latest.bbWidth ?? 0).toFixed(1)}%`}
                />
                <Indicator
                  name="ATR (Average True Range)"
                  formula="ATR = avg(14) de True Range"
                  description="Volatilidade absoluta. Usado para stop-loss e position sizing."
                  value={data.latest.atr}
                  extra={`${(data.latest.atrPct ?? 0).toFixed(2)}% do preço`}
                />
                <Indicator
                  name="Keltner Channels"
                  formula="Upper/Lower = EMA20 ± 2×ATR"
                  description="Similar a Bollinger mas usa ATR. Boa para breakout trading."
                  value={`${(data.latest.keltnerUpper ?? 0).toFixed(2)} / ${(data.latest.keltnerLower ?? 0).toFixed(2)}`}
                />
                <Indicator
                  name="Volatilidade anualizada"
                  formula="σ_anual = σ_diária × √252"
                  description="Desvio padrão dos retornos diários anualizado. ~15-25% = normal pra ações, >40% = alta volatilidade."
                  value={data.latest.volatility != null ? `${data.latest.volatility.toFixed(1)}%` : null}
                />
              </div>
            )}

            {activeGroup === "volume" && (
              <div className="space-y-4">
                <Indicator
                  name="OBV (On-Balance Volume)"
                  formula="OBV += volume se close subiu, -= volume se caiu"
                  description="Acumulação de volume. Slope positivo = compradores acumulando."
                  value={data.latest.obv}
                  extra={`Slope 5d: ${data.latest.obvSlope && data.latest.obvSlope > 0 ? "+" : ""}${data.latest.obvSlope?.toLocaleString() ?? "—"}`}
                />
                <Indicator
                  name="CMF (Chaikin Money Flow)"
                  formula="CMF = sum(MFV × volume, 20) / sum(volume, 20)"
                  description="Pressão compradora/vendedora. >0.05 = acumulação, <-0.05 = distribuição."
                  value={data.latest.cmf}
                  extra={interpCMF(data.latest.cmf ?? 0)}
                />
                <Indicator
                  name="VWAP (Volume-Weighted Avg Price)"
                  formula="VWAP = Σ(P×V) / Σ(V)"
                  description="Preço médio ponderado por volume. Acima = bullish, abaixo = bearish."
                  value={data.latest.vwap}
                />
              </div>
            )}

            {activeGroup === "fractal" && (
              <div className="space-y-4">
                <Indicator
                  name="Hurst Exponent (R/S method)"
                  formula="H via regressão de log(R/S) em log(lag)"
                  description="Mede memória de longo prazo. <0.5 mean-reverting, =0.5 random walk, >0.5 trending."
                  value={data.latest.hurst}
                  extra={interpHurst(data.latest.hurst)}
                />
                <Indicator
                  name="Z-Score (rolling 20d)"
                  formula="Z = (price - SMA20) / σ20"
                  description="Desvio padronizado do preço em relação à média de 20 dias. |Z|>2 = significante."
                  value={data.latest.zScore}
                  extra={interpZScore(data.latest.zScore ?? 0)}
                />
              </div>
            )}

            {activeGroup === "risk" && (
              <div className="space-y-4">
                <Indicator
                  name="Sharpe Ratio (anualizado)"
                  formula="Sharpe = μ_r / σ_r × √252"
                  description="Retorno excedente por unidade de volatilidade total. >1 = bom, >2 = excelente."
                  value={data.latest.sharpe}
                />
                <Indicator
                  name="Sortino Ratio"
                  formula="Sortino = μ_r / σ_downside × √252"
                  description="Similar ao Sharpe mas usa só volatilidade downside (retornos negativos). Melhor pra distribuições assimétricas."
                  value={data.latest.sortino}
                />
                <Indicator
                  name="Maximum Drawdown"
                  formula="MDD = max(peak - trough) / peak"
                  description="Maior queda peak-to-trough no período. Mede risco de cauda histórico."
                  value={data.latest.maxDrawdown != null ? `${data.latest.maxDrawdown.toFixed(1)}%` : null}
                />
                <Indicator
                  name="Value at Risk (95%)"
                  formula="VaR95 = -quantile(5%) de retornos diários"
                  description="Perda máxima em 1 dia com 95% de confiança. Métrica histórica."
                  value={data.latest.var95 != null ? `${data.latest.var95.toFixed(2)}%` : null}
                />
                <Indicator
                  name="Conditional VaR (95%)"
                  formula="CVaR95 = E[loss | loss > VaR95]"
                  description="Perda esperada dado que estamos no pior 5%. Mais conservador que VaR."
                  value={data.latest.cvar95 != null ? `${data.latest.cvar95.toFixed(2)}%` : null}
                />
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-text-muted">
            Baseado em {data.bars} candles diários. Cache: 1h. Fontes: Yahoo Finance.
          </div>
        </>
      )}
    </div>
  );
}

function Indicator({
  name,
  formula,
  description,
  value,
  extra,
  interpretation,
}: {
  name: string;
  formula: string;
  description: string;
  value: string | number | null;
  extra?: string | { tone: "positive" | "negative" | "neutral"; text: string };
  interpretation?: { tone: "positive" | "negative" | "neutral"; text: string };
}) {
  return (
    <div className="border-l-2 border-border-subtle pl-4">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-medium text-foreground text-sm">{name}</h3>
        <span className="font-mono font-semibold tabular-nums">
          {value == null ? "—" : String(value)}
          {extra && (
            typeof extra === "string" ? (
              <span className="ml-2 text-xs text-text-muted font-normal">{extra}</span>
            ) : (
              <span
                className={cn(
                  "ml-2 text-xs font-normal",
                  extra.tone === "positive" && "text-positive",
                  extra.tone === "negative" && "text-negative",
                  extra.tone === "neutral" && "text-text-muted",
                )}
              >
                → {extra.text}
              </span>
            )
          )}
        </span>
      </div>
      {interpretation && (
        <div
          className={cn(
            "text-xs mb-1",
            interpretation.tone === "positive" && "text-positive",
            interpretation.tone === "negative" && "text-negative",
            interpretation.tone === "neutral" && "text-text-muted",
          )}
        >
          → {interpretation.text}
        </div>
      )}
      <p className="text-xs text-text-secondary mb-1">{description}</p>
      <code className="text-[10px] text-text-muted font-mono">{formula}</code>
    </div>
  );
}

// Interpretations
function interpADX(v: number | null): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (v == null) return { tone: "neutral", text: "—" };
  if (v > 25) return { tone: "positive", text: "tendência forte" };
  if (v < 20) return { tone: "neutral", text: "sem tendência definida" };
  return { tone: "neutral", text: "tendência moderada" };
}
function interpAroon(up: number, down: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (up > 70 && down < 30) return { tone: "positive", text: "tendência de alta" };
  if (down > 70 && up < 30) return { tone: "negative", text: "tendência de baixa" };
  return { tone: "neutral", text: "sem direção clara" };
}
function interpStochastic(k: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (k > 80) return { tone: "negative", text: "sobrecomprado" };
  if (k < 20) return { tone: "positive", text: "sobrevendido" };
  return { tone: "neutral", text: "zona neutra" };
}
function interpWilliams(r: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (r > -20) return { tone: "negative", text: "sobrecomprado" };
  if (r < -80) return { tone: "positive", text: "sobrevendido" };
  return { tone: "neutral", text: "zona neutra" };
}
function interpCCI(v: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (v > 100) return { tone: "positive", text: "forte alta" };
  if (v < -100) return { tone: "negative", text: "forte baixa" };
  return { tone: "neutral", text: "normal" };
}
function interpMFI(v: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (v > 80) return { tone: "negative", text: "sobrecomprado" };
  if (v < 20) return { tone: "positive", text: "sobrevendido" };
  return { tone: "neutral", text: "fluxo neutro" };
}
function interpCMF(v: number): string {
  if (v > 0.05) return "acumulação";
  if (v < -0.05) return "distribuição";
  return "neutro";
}
function interpHurst(h: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (h > 0.55) return { tone: "positive", text: "tendência persistente (momentum continua)" };
  if (h < 0.45) return { tone: "negative", text: "mean-reverting (volta à média)" };
  return { tone: "neutral", text: "random walk" };
}
function interpZScore(z: number): { tone: "positive" | "negative" | "neutral"; text: string } {
  if (Math.abs(z) > 2) return { tone: "neutral", text: "desvio significativo" };
  if (z > 1) return { tone: "positive", text: "acima da média" };
  if (z < -1) return { tone: "negative", text: "abaixo da média" };
  return { tone: "neutral", text: "dentro do normal" };
}
