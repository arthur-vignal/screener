"use client";

/**
 * QualityVsPriceScatter — scatter EV/EBITDA × ROIC com pares do subsetor.
 *
 * Para o leva 1, mostra apenas o ativo atual destacado num grid
 * conceitual (barato/caro × ruim/bom). Os pares virão na leva 2
 * quando integrarmos com /api/v2/tickers do Brapi pra puxar o
 * subsetor.
 *
 * Estrutura visual: 4 quadrantes com o ativo posicionado pelo
 * EV/EBITDA (eixo X) e ROIC (eixo Y).
 *
 * Diagonal separa "barato porque ruim" (inf-esq) de "barato apesar
 * de bom" (sup-esq). É a leitura clássica de buy-side.
 */

import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  /** ROIC (0-1, ex: 0.18 = 18%). null se não disponível. */
  roic: number | null;
  /** EV/EBITDA. null se EBITDA <= 0 ou ausente. */
  evEbitda: number | null;
  /** WACC aproximado pra desenhar a linha do "fair value". null = não desenhar. */
  wacc?: number | null;
  loading?: boolean;
};

export function QualityVsPriceScatter({ roic, evEbitda, wacc, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#101116] p-4 h-full flex flex-col">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  // Normaliza pra coordenadas do gráfico (0-100 em X e Y)
  // X (EV/EBITDA): 0 = muito barato, 100 = muito caro
  // Y (ROIC): 0 = muito ruim (sem retorno), 100 = excelente (>20%)
  const x = evEbitda != null && evEbitda > 0 ? clamp01((evEbitda - 0) / (30 - 0)) * 100 : null;
  const y = roic != null ? clamp01((roic - 0) / (0.25 - 0)) * 100 : null;

  // Quadrante baseado no ROIC médio do setor (~12%)
  const yMid = clamp01((0.12 - 0) / 0.25) * 100;

  return (
    <div className="rounded-xl border border-white/10 bg-[#101116] p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Qualidade × preço
        </div>
        <div className="flex items-center gap-3 text-[11px] tabular-nums">
          <span className="text-muted-foreground/60">
            ROIC{" "}
            <span className="text-foreground">
              {roic != null ? `${(roic * 100).toFixed(1)}%` : "—"}
            </span>
          </span>
          <span className="text-muted-foreground/60">
            EV/EBITDA{" "}
            <span className="text-foreground">{evEbitda != null ? evEbitda.toFixed(1) : "—"}</span>
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[260px]">
        {/* Grid de fundo */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* sup-esq: barato + bom */}
          <div className="border-r border-b border-white/[0.06] bg-[rgba(77,190,149,0.04)] rounded-tl-md" />
          {/* sup-dir: caro + bom */}
          <div className="border-b border-white/[0.06] bg-[rgba(255,255,255,0.02)] rounded-tr-md" />
          {/* inf-esq: barato + ruim */}
          <div className="border-r border-white/[0.06] bg-[rgba(216,79,104,0.04)] rounded-bl-md" />
          {/* inf-dir: caro + ruim */}
          <div className="bg-[rgba(216,79,104,0.04)] rounded-br-md" />
        </div>

        {/* Eixos labels */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Y-axis labels */}
          <div className="absolute left-1 top-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">
            bom (ROIC &gt; 12%)
          </div>
          <div className="absolute left-1 bottom-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">
            ruim
          </div>
          {/* X-axis labels */}
          <div className="absolute bottom-1 left-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">
            barato
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">
            caro
          </div>
        </div>

        {/* Linha WACC/ROIC limite */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-white/20"
          style={{ top: `${yMid}%` }}
        >
          <span className="absolute -top-3 right-2 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/50 bg-[#101116] px-1">
            ROIC = 12%
          </span>
        </div>

        {/* Ativo atual */}
        {x != null && y != null ? (
          <div
            className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-foreground/30 shadow-lg shadow-foreground/40"
            style={{ left: `${x}%`, top: `${100 - y}%` }}
            title={`ROIC ${(roic! * 100).toFixed(1)}% · EV/EBITDA ${evEbitda!.toFixed(1)}`}
          >
            <div className="absolute inset-0 rounded-full bg-foreground animate-ping opacity-30" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground/60">
            Sem ROIC ou EV/EBITDA disponíveis.
          </div>
        )}
      </div>

      <div className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/50 text-center">
        {wacc != null && (
          <>WACC ≈ {(wacc * 100).toFixed(1)}% · spread ROIC − WACC ≈{" "}
          {roic != null ? `${((roic - wacc) * 100).toFixed(1)} p.p.` : "—"}</>
        )}
      </div>
    </div>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
