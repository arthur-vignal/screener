"use client";

/**
 * /dev/components — playground pra visualizar todos os componentes foundation.
 *
 * ⚠️ ESTA PÁGINA É SÓ PRA VALIDAR FUNCIONALIDADE, NÃO ESTILO.
 *    O estilo final de cada componente é calibrado quando ele é usado em
 *    produção (/home, /asset/[symbol], /analysis) seguindo a sulfur-ui-rules.
 *    O que importa aqui é:
 *      - componente renderiza sem crash
 *      - os 3 estados aparecem lado a lado (loading/empty/error)
 *      - proporções, hierarquia e interações funcionam
 *      - tipos TS batem (passa no typecheck)
 *
 *    NÃO USE ESTA PÁGINA COMO REFERÊNCIA VISUAL FINAL.
 */

import {
  BarChart3,
  Bell,
  Home,
  LineChart,
  Newspaper,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  BrandLetter,
  SulfurDock as DashboardDock,
  DataTable,
  Delta,
  IndexLogo,
  MetricGroupHeader,
  MetricRow,
  PeriodTabs,
  PreviewWidget,
  SegmentedControl,
  Skeleton,
  StatusBar,
  type PeriodRange,
} from "@/components/foundation";
import { useState } from "react";

const SECTION_H = "text-[11px] uppercase tracking-[0.18em] text-muted-foreground/85 font-semibold mt-10 mb-3";

// ─── Demo helpers ────────────────────────────────────────────────────────────

function DemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#101116] p-5 mb-4">
      <div className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-3 font-medium">
        {title}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DevComponentsPage() {
  const [seg, setSeg] = useState<"economics" | "markets">("markets");
  const [period, setPeriod] = useState<PeriodRange>({
    startYear: null,
    endYear: null,
  });

  return (
    <main className="min-h-screen bg-[#070709] text-foreground px-6 py-10 pb-32">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-semibold tracking-tight mb-1">
          Foundation components
        </h1>
        <p className="text-[13px] text-muted-foreground mb-8">
          Playground visual da Fase 1 do redesign.
        </p>

        {/* ── Delta ──────────────────────────────────────────────────────── */}
        <div className={SECTION_H}>Delta — variação numérica com sinal redundante</div>
        <DemoCard title="Sizes">
          <Delta value={2.45} unit="percent" size="sm" />
          <Delta value={2.45} unit="percent" size="md" />
          <Delta value={2.45} unit="percent" size="lg" />
          <Delta value={-1.23} unit="percent" size="md" />
          <Delta value={0} unit="percent" size="md" />
          <Delta value={null} unit="percent" size="md" />
        </DemoCard>
        <DemoCard title="Units">
          <Delta value={2.45} unit="percent" />
          <Delta value={-1234.56} unit="currency" currency="BRL" />
          <Delta value={-1234.56} unit="currency" currency="USD" />
          <Delta value={42} unit="number" />
        </DemoCard>

        {/* ── Skeleton ───────────────────────────────────────────────────── */}
        <div className={SECTION_H}>Skeleton</div>
        <DemoCard title="Shapes">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton roundedFull className="h-10 w-10" />
          <Skeleton roundedMd className="h-8 w-24" />
        </DemoCard>

        {/* ── BrandLetter ────────────────────────────────────────────────── */}
        <div className={SECTION_H}>BrandLetter — avatar circular de ticker</div>
        <DemoCard title="Sizes">
          <BrandLetter symbol="PETR4" size="sm" />
          <BrandLetter symbol="PETR4" size="md" />
          <BrandLetter symbol="PETR4" size="lg" />
          <BrandLetter symbol="VALE3" size="md" />
          <BrandLetter symbol="ITUB4" size="md" />
          <BrandLetter symbol="ABEV3" size="md" />
          <BrandLetter symbol="MGLU3" size="md" />
          <BrandLetter symbol="WEGE3" size="md" />
          <BrandLetter symbol="XPTO11" size="md" />
        </DemoCard>

        {/* ── IndexLogo ──────────────────────────────────────────────────── */}
        <div className={SECTION_H}>IndexLogo — logo circular de índice B3</div>
        <DemoCard title="Sizes">
          <IndexLogo symbol="IBOV" size="sm" />
          <IndexLogo symbol="IBOV" size="md" />
          <IndexLogo symbol="IBOV" size="lg" />
          <IndexLogo symbol="IFIX" size="md" />
          <IndexLogo symbol="SMLL" size="md" />
          <IndexLogo symbol="IDIV" size="md" />
          <IndexLogo symbol="XPTO" size="md" />
        </DemoCard>

        {/* ── PeriodTabs ─────────────────────────────────────────────────── */}
        <div className={SECTION_H}>PeriodTabs — seletor de período</div>
        <DemoCard title="Default">
          <PeriodTabs
            value={period}
            onChange={setPeriod}
            presets={[
              { label: "1A", value: { startYear: 2025, endYear: null } },
              { label: "3A", value: { startYear: 2023, endYear: null } },
              { label: "5A", value: { startYear: 2021, endYear: null } },
              { label: "Max", value: { startYear: null, endYear: null } },
            ]}
          />
        </DemoCard>

        {/* ── SegmentedControl ───────────────────────────────────────────── */}
        <div className={SECTION_H}>SegmentedControl — alternador de tabs</div>
        <DemoCard title="Default">
          <SegmentedControl
            value={seg}
            onChange={setSeg}
            segments={[
              { value: "economics", label: "Economics" },
              { value: "markets", label: "Markets", icon: BarChart3 },
            ]}
          />
        </DemoCard>
        <DemoCard title="Com item desabilitado">
          <SegmentedControl
            value="economics"
            onChange={() => {}}
            segments={[
              { value: "economics", label: "Economics" },
              { value: "markets", label: "Markets" },
              {
                value: "insider",
                label: "Insider trading",
                disabledReason: "Em breve",
              },
            ]}
          />
        </DemoCard>

        {/* ── StatusBar ──────────────────────────────────────────────────── */}
        <div className={SECTION_H}>StatusBar — info do mercado</div>
        <DemoCard title="Default">
          <StatusBar />
        </DemoCard>

        {/* ── MetricRow ──────────────────────────────────────────────────── */}
        <div className={SECTION_H}>MetricRow — linha da tabela de métricas</div>
        <div className="rounded-xl border border-white/10 bg-[#101116] overflow-hidden">
          <MetricGroupHeader label="Valuation" />
          <MetricRow
            label="P/L"
            sublabel="trailing"
            value="4,15x"
            delta={-1.2}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            onClick={() => alert("Ir pra /valuation")}
          />
          <MetricRow
            label="EV/EBITDA"
            value="50,44x"
            delta={-308.66}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            onClick={() => alert("Ir pra /valuation")}
          />
          <MetricRow
            label="P/VP"
            value="0,90x"
            delta={-12.62}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            onClick={() => alert("Ir pra /valuation")}
          />
          <MetricRow
            label="Dividend Yield"
            value="8,04%"
            delta={-71.63}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            onClick={() => alert("Ir pra /dividends")}
          />
          <MetricGroupHeader label="Rentabilidade" />
          <MetricRow
            label="ROIC"
            value="1,30%"
            delta={67.62}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            onClick={() => alert("Ir pra /profitability")}
          />
        </div>

        {/* ── PreviewWidget ─────────────────────────────────────────────── */}
        <div className={SECTION_H}>PreviewWidget — card clicável do /asset</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PreviewWidget
            eyebrow="Valuation"
            label="P/L"
            value="4,15x"
            delta={-1.2}
            href="/asset/PETR4/valuation"
          />
          <PreviewWidget
            eyebrow="Profitability"
            label="ROIC"
            value="1,30%"
            delta={67.62}
            href="/asset/PETR4/profitability"
          />
          <PreviewWidget
            eyebrow="Risk"
            label="Beta"
            value="1,18"
            delta={-2.5}
            href="/asset/PETR4/risk"
          />
          <PreviewWidget
            eyebrow="Dividends"
            label="Yield"
            value="8,04%"
            delta={-71.63}
            href="/asset/PETR4/dividends"
          />
        </div>

        {/* ── DataTable ──────────────────────────────────────────────────── */}
        <div className={SECTION_H}>DataTable — tabela estilo excel</div>
        <DemoCard title="Com dados">
          <DataTable
            columns={[
              { key: "year", header: "Ano", width: "100px" },
              { key: "revenue", header: "Receita (R$ mi)", numeric: true, align: "right" },
              { key: "netIncome", header: "Lucro líquido", numeric: true, align: "right" },
              { key: "roe", header: "ROE", numeric: true, align: "right" },
              { key: "roic", header: "ROIC", numeric: true, align: "right" },
            ]}
            data={[
              { year: "2024", revenue: "412.337", netIncome: "31.221", roe: "11,2%", roic: "8,9%" },
              { year: "2023", revenue: "388.122", netIncome: "27.540", roe: "10,1%", roic: "8,0%" },
              { year: "2022", revenue: "350.418", netIncome: "22.115", roe: "8,5%", roic: "6,7%" },
              { year: "2021", revenue: "302.015", netIncome: "18.840", roe: "7,4%", roic: "5,9%" },
              { year: "2020", revenue: "261.234", netIncome: "12.405", roe: "5,2%", roic: "4,1%" },
              { year: "2019", revenue: "295.118", netIncome: "20.317", roe: "8,1%", roic: "6,5%" },
            ]}
            onExportCsv={() => alert("CSV exportado")}
            caption="Demonstração de resultados anuais"
          />
        </DemoCard>
        <DemoCard title="Loading">
          <DataTable
            columns={[
              { key: "year", header: "Ano" },
              { key: "value", header: "Valor", numeric: true, align: "right" },
            ]}
            data={[]}
            loading
            skeletonRows={4}
          />
        </DemoCard>
        <DemoCard title="Empty">
          <DataTable
            columns={[
              { key: "year", header: "Ano" },
              { key: "value", header: "Valor", numeric: true, align: "right" },
            ]}
            data={[]}
            emptyMessage="Sem dados para este ativo no período selecionado."
          />
        </DemoCard>

        {/* ── DashboardDock (sempre visível) ────────────────────────────── */}
        <div className={SECTION_H}>DashboardDock — dock inferior centralizado</div>
        <p className="text-[12px] text-muted-foreground mb-3">
          Aparece fixo no bottom da tela (fixed positioning). Clica em qualquer
          item pra navegar. Na rota <code className="text-foreground">/dev/components</code>{" "}
          nenhum item fica ativo — navega pra <code className="text-foreground">/home</code> ou{" "}
          <code className="text-foreground">/analysis</code> pra ver o highlight.
        </p>
      </div>

      <DashboardDock />
    </main>
  );
}
