"use client";

/**
 * ValuationBandChart — gráfico de banda histórica de um múltiplo
 * (P/L, P/VP, EV/EBITDA, EV/Receita) com:
 *
 *  - Linhas de σ reais (±1σ, ±2σ) calculadas a partir dos pontos válidos
 *  - Média destacada como referência central
 *  - **Lacunas hachuradas** quando o múltiplo fica indefinido
 *    (lucro negativo, EBITDA negativo). Em vez de filtrar os pontos,
 *    exibimos uma faixa hachurada com label "lucro/EBITDA negativo —
 *    múltiplo indefinido", mostrando a verdade sem mentir.
 *  - Marcador do valor atual (linha horizontal)
 *  - Tooltip mostrando ano, valor e classificação vs banda
 *
 * Props:
 *   history:    série de { endDate, value } (decrescente, do mais recente)
 *   current:    valor atual (do quote) ou null
 *   title:      label do múltiplo (ex: "P/L")
 *   unit:       "multiple" | "percent"
 *   accentColor: cor do ativo pra linhas
 */

import { useMemo } from "react";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, CartesianGrid } from "recharts";
import { formatMultiple } from "@/lib/format";

type HistoryPoint = { endDate: string; value: number | null };

type Props = {
  history: HistoryPoint[];
  current: number | null;
  title: string;
  unit?: "multiple" | "percent";
  /** Cor da linha de média (default: branco). */
  accentColor?: string;
  /** Slot extra no header — usado pra seletor de múltiplo. */
  headerExtra?: React.ReactNode;
};

type Row = {
  year: string;
  value: number | null;
  valid: boolean;
  zscore: number | null;
};

export function ValuationBandChart({
  history,
  current,
  title,
  unit = "multiple",
  accentColor = "#ffffff",
  headerExtra,
}: Props) {
  // Processa a série: ordena ascendente por ano, calcula média e σ.
  const rows: Row[] = useMemo(() => {
    // converte endDate → year. Pontos com múltiplo indefinido (negativo
    // ou zero) recebem value=null pra que a linha QUEBRE no gráfico
    // (em vez de plotar um ponto isolado que distorce a escala Y).
    const sorted = history
      .slice()
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .map((p) => {
        const valid =
          p.value != null && Number.isFinite(p.value) && p.value > 0;
        return {
          year: p.endDate?.slice(0, 4) ?? "?",
          value: valid ? p.value : null,
          valid,
        };
      });

    // calcula média e σ dos pontos VÁLIDOS (não-negativos e finitos)
    const validValues = sorted.filter((r) => r.valid).map((r) => r.value as number);
    const n = validValues.length;
    const mean = n > 0 ? validValues.reduce((s, v) => s + v, 0) / n : null;
    const variance =
      mean != null && n > 1
        ? validValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
        : null;
    const std = variance != null ? Math.sqrt(variance) : null;

    // z-score por ponto
    return sorted.map((r) => ({
      ...r,
      zscore:
        r.valid && mean != null && std != null && std > 0
          ? ((r.value as number) - mean) / std
          : null,
    }));
  }, [history]);

  // Calcula média e σ uma vez (a partir de rows) pra usar nas ReferenceLine
  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.valid).map((r) => r.value as number);
    if (valid.length < 2) return null;
    const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
    const variance = valid.reduce((s, v) => s + (v - mean) ** 2, 0) / (valid.length - 1);
    const std = Math.sqrt(variance);
    return { mean, std };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#101116] px-5 py-12 text-center text-[12px] text-muted-foreground/80">
        Sem histórico suficiente pra {title.toLowerCase()}.
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#101116] px-5 py-12 text-center text-[12px] text-muted-foreground/80">
        Histórico de {title} insuficiente (precisa de pelo menos 2 anos válidos).
      </div>
    );
  }

  const { mean, std } = stats;
  const yMin = Math.max(0, Math.min(...rows.filter((r) => r.valid).map((r) => r.value as number)) - std);
  const yMax = Math.max(...rows.filter((r) => r.valid).map((r) => r.value as number)) + std;

  return (
    <div className="rounded-xl border border-white/10 bg-[#101116] p-4">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/85">
          {title} — banda histórica ±2σ
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 tabular-nums">
          <span>
            <span className="text-muted-foreground/40">μ</span>{" "}
            {formatMultiple(mean)}
          </span>
          <span>
            <span className="text-muted-foreground/40">σ</span>{" "}
            {formatMultiple(std)}
          </span>
          {current != null && (
            <span className="text-foreground">
              <span className="text-muted-foreground/40">atual</span>{" "}
              {unit === "multiple"
                ? formatMultiple(current)
                : `${current.toFixed(1)}%`}
            </span>
          )}
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />

            <XAxis
              dataKey="year"
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "rgba(200,200,210,0.55)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) =>
                unit === "multiple" ? formatMultiple(v) : `${v.toFixed(1)}%`
              }
            />

            {/* Hachura pra anos com múltiplo indefinido */}
            {rows.map((r, i) => {
              if (r.valid) return null;
              const next = rows[i + 1];
              const start = r.year;
              const end = next?.year ?? r.year;
              return (
                <ReferenceArea
                  key={`gap-${r.year}`}
                  x1={start}
                  x2={end}
                  fill="rgba(255,255,255,0.04)"
                  fillOpacity={1}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="2 4"
                  label={{
                    value: "indefinido",
                    position: "insideTop",
                    fill: "rgba(200,200,210,0.4)",
                    fontSize: 9,
                  }}
                />
              );
            })}

            {/* Faixa ±2σ (mais escura) */}
            <ReferenceArea
              y1={mean - 2 * std}
              y2={mean + 2 * std}
              fill="rgba(255,255,255,0.025)"
              stroke="none"
            />
            {/* Faixa ±1σ (mais clara) */}
            <ReferenceArea
              y1={mean - std}
              y2={mean + std}
              fill="rgba(255,255,255,0.04)"
              stroke="none"
            />

            {/* Linha de média */}
            <ReferenceLine
              y={mean}
              stroke="rgba(200,210,230,0.4)"
              strokeDasharray="4 4"
              label={{
                value: "média",
                position: "right",
                fill: "rgba(200,210,230,0.5)",
                fontSize: 9,
              }}
            />

            {/* Linha de valor atual */}
            {current != null && (
              <ReferenceLine
                y={current}
                stroke={accentColor}
                strokeWidth={1.5}
                strokeDasharray="2 2"
              />
            )}

            {/* Linha principal + pontos color coded por posição vs média.
                Acima da média = vermelho (caro, cuidado).
                Abaixo da média = verde (barato, oportunidade).
                Na média = branco (justo). */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1.25}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload?.valid !== true || payload?.value == null) return null;
                const v = payload.value;
                const color =
                  v > mean
                    ? "var(--negative)"
                    : v < mean
                      ? "var(--positive)"
                      : accentColor;
                const r =
                  payload?.zscore != null && Math.abs(payload.zscore) > 1.5 ? 4 : 3;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={color}
                    stroke="transparent"
                    fillOpacity={1}
                  />
                );
              }}
              activeDot={{ r: 5, fill: accentColor, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls={false}
            />

            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0]?.payload as Row | undefined;
                if (!p) return null;
                const z = p.zscore;
                const labelZ = z == null
                  ? "—"
                  : z > 2
                    ? "+2σ (caro)"
                    : z > 1
                      ? "+1σ"
                      : z > -1
                        ? "dentro de ±1σ"
                        : z > -2
                          ? "−1σ"
                          : "−2σ (barato)";
                return (
                  <div className="px-3 py-2 rounded-lg bg-[#15151a]/95 backdrop-blur-md text-[11px] border border-white/10 space-y-1">
                    <p className="text-muted-foreground">{label}</p>
                    {p.valid ? (
                      <>
                        <p className="text-foreground font-medium">
                          {unit === "multiple"
                            ? formatMultiple(p.value as number)
                            : `${(p.value as number).toFixed(2)}%`}
                        </p>
                        <p className="text-muted-foreground/85">{labelZ}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground/85 italic">
                        múltiplo indefinido (lucro/EBITDA negativo)
                      </p>
                    )}
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
