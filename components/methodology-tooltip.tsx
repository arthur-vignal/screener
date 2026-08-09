"use client";

import { useState } from "react";
import { Info, X, BookOpen } from "lucide-react";

/**
 * Methodology disclosures for Brazilian (BR) tickers.
 *
 * Surfaces: P/L, P/VP, ROE, Dividend Yield, Margem, etc.
 * Each entry briefly explains the formula, source, and any caveats.
 */

export const BR_METHODOLOGY: Array<{
  metric: string;
  formula: string;
  source: string;
  note?: string;
}> = [
  {
    metric: "P/L (TTM)",
    formula: "Preço atual ÷ LPA TTM",
    source: "Brapi Pro + CVM ITR/DFP via lib/cvm-seed",
    note: "TTM = soma dos últimos 4 trimestres. Quando Brapi não tem o quarter mais recente, usamos CVM ITR diretamente (Railway não tem egress para CVM, então os JSONs são estáticos — refresh manual ou via npm run refresh-cvm).",
  },
  {
    metric: "P/VP",
    formula: "Preço atual ÷ Valor Patrimonial por ação",
    source: "Brapi Pro (defaultKeyStatistics.bookValue)",
    note: "P/VP usa snapshot do último balanço (não TTM). Patrimônio líquido é estático até o próximo ITR/DFP.",
  },
  {
    metric: "ROE (TTM)",
    formula: "Lucro líquido TTM ÷ Patrimônio líquido (último quarter)",
    source: "Brapi Pro + CVM ITR/DFP",
    note: "Lucro acumulado em 12 meses dividido pelo PL do último quarter. Não anualizado — vai retroagir conforme quarters saem.",
  },
  {
    metric: "ROA (TTM)",
    formula: "Lucro líquido TTM ÷ Ativo total (último quarter)",
    source: "Brapi Pro + CVM ITR/DFP",
  },
  {
    metric: "Margem Bruta",
    formula: "Lucro bruto TTM ÷ Receita TTM",
    source: "CVM ITR (Receita de Venda de Bens e/ou Serviços; Resultado Bruto)",
  },
  {
    metric: "Margem Operacional",
    formula: "EBIT TTM ÷ Receita TTM",
    source: "CVM ITR/DFP (Resultado Antes do Resultado Financeiro e dos Tributos)",
  },
  {
    metric: "Margem Líquida",
    formula: "Lucro líquido TTM ÷ Receita TTM",
    source: "CVM ITR/DFP",
  },
  {
    metric: "LPA (TTM)",
    formula: "Lucro líquido TTM ÷ Ações em circulação",
    source: "CVM ITR/DFP (lucro) + Brapi Pro (shares)",
    note: "Dividido por shares reportado no último snapshot da Brapi. Não conseguimos P/L por classe (ON vs PN) — estimamos um LPA único por empresa.",
  },
  {
    metric: "Dividend Yield (TTM)",
    formula: "Soma dos dividendos pagos nos últimos 4 quarters ÷ Preço atual",
    source: "Brapi Pro cashflowHistoryQuarterly (dividendsPaid)",
    note: "Usa o total pago em caixa, não o declarado por ação. JCP (Juros sobre Capital Próprio) é incluído quando aparece em dividendsPaid.",
  },
  {
    metric: "EBIT",
    formula: "Receita − Custos − Despesas Operacionais",
    source: "CVM ITR/DFP (Resultado Antes do Resultado Financeiro e dos Tributos)",
    note: "Equivalente ao 'OperatingIncome' do Brapi. Sulfur prefere CVM porque tem 1 quarter a mais de recência.",
  },
  {
    metric: "EBITDA",
    formula: "Não fornecido diretamente — usamos o valor da Brapi Pro (yearly)",
    source: "Brapi Pro financialData.ebitda",
    note: "Para TTM rolling, faríamos EBIT + D&A. Como a Brapi não retorna D&A histórico, usamos o valor yearly estático.",
  },
  {
    metric: "Trimestre vs Quarter",
    formula: "Trimestre = quarter = 3 meses",
    source: "Convenção brasileira",
    note: "Em Portugal/educação, 'trimestre' pode significar 4 meses. No Brasil corporativo, sempre 3 meses. Q1/Q2/Q3 são ITRs da CVM; Q4 vem do DFP anual.",
  },
];

export function MethodologyTooltip({ metricKey }: { metricKey: string }) {
  const [open, setOpen] = useState(false);
  const entry = BR_METHODOLOGY.find((m) => m.metric === metricKey);
  if (!entry) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="ml-1 text-muted hover:text-brand-bright transition-colors"
        aria-label={`Metodologia de ${entry.metric}`}
      >
        <Info className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 bottom-full mb-1 w-80 bg-surface border border-hairline rounded-md shadow-lg p-3 text-xs">
          <div className="font-medium text-ink mb-1">{entry.metric}</div>
          <div className="text-body mb-2">
            <span className="text-muted">Fórmula: </span>
            <span className="font-mono">{entry.formula}</span>
          </div>
          <div className="text-body mb-2">
            <span className="text-muted">Fonte: </span>
            {entry.source}
          </div>
          {entry.note && (
            <div className="text-body leading-relaxed">{entry.note}</div>
          )}
        </div>
      )}
    </span>
  );
}

/**
 * "Sobre os dados" — botão full-page no rodapé da página de asset.
 * Lista TODAS as métricas com disclaimer e link para refresh-cvm.
 */
export function MethodologyFooter({ ticker }: { ticker: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-8 pt-4 border-t border-hairline flex items-center gap-2 text-xs text-muted">
        <BookOpen className="w-3.5 h-3.5" />
        <button
          onClick={() => setOpen(true)}
          className="link-underline hover:text-brand-deep"
        >
          Sobre os dados e metodologia
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          style={{ background: "color-mix(in srgb, var(--canvas-soft) 78%, transparent)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-canvas border border-hairline-strong max-w-3xl w-full my-12 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 py-[15px] border-b border-hairline-strong flex items-center justify-between">
              <div className="label label-muted-2">
                <span className="text-brand-deep mr-2">Sulfur.io</span>
                <span>· Metodologia de cálculo · {ticker}</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="w-6 h-6 border border-hairline-strong flex items-center justify-center hover:bg-canvas-soft text-ink press"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="px-7 py-[28px] max-h-[70vh] overflow-y-auto">
              <h2 className="font-display text-[24px] text-ink mb-4 tracking-[-0.03em]">
                Como o Sulfur calcula os indicadores
              </h2>

              <p className="text-[13.5px] text-body leading-relaxed mb-6">
                O Sulfur usa uma abordagem <strong>híbrida</strong> para ativos brasileiros:
                prioriza dados oficiais da <strong>CVM (ITR/DFP)</strong> via arquivos
                estáticos (<code className="font-mono text-[12px]">lib/cvm-data/</code> gerados
                por <code className="font-mono text-[12px]">npm run refresh-cvm</code>) e usa{" "}
                <strong>Brapi Pro</strong> como fallback para campos que a CVM não fornece
                (EPS, dividendsPaid, cashflow). O Railway bloqueia egress para{" "}
                <code className="font-mono text-[12px]">dados.cvm.gov.br</code>, então os dados
                CVM são commitados no repositório e atualizados manualmente a cada quarter.
              </p>

              <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em] mt-6">
                TTM (Trailing Twelve Months)
              </h3>
              <p className="text-[13.5px] text-body leading-relaxed mb-4">
                A maioria das métricas de valuation é calculada com base nos últimos 4
                trimestres (12 meses), não no ano calendário. Isso captura o resultado mais
                recente — em particular, quando uma empresa publica o Q2 2026, o TTM passa a
                incluir Q3'25 + Q4'25 + Q1'26 + Q2'26, deixando o P/L e o ROE mais alinhados com
                o momento atual.
              </p>

              <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em] mt-6">
                Detalhamento por métrica
              </h3>
              <div className="space-y-4">
                {BR_METHODOLOGY.map((entry) => (
                  <div key={entry.metric} className="border-l-2 border-hairline pl-3">
                    <div className="text-[13px] font-medium text-ink mb-1">
                      {entry.metric}
                    </div>
                    <div className="text-[12px] text-body mb-1">
                      <span className="text-muted">Fórmula: </span>
                      <span className="font-mono">{entry.formula}</span>
                    </div>
                    <div className="text-[12px] text-body mb-1">
                      <span className="text-muted">Fonte: </span>
                      {entry.source}
                    </div>
                    {entry.note && (
                      <div className="text-[12px] text-muted leading-relaxed">
                        {entry.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <h3 className="font-display text-[16px] text-ink mb-3 tracking-[-0.02em] mt-6">
                Por que alguns P/L divergem de StatusInvest/Investidor10?
              </h3>
              <p className="text-[13.5px] text-body leading-relaxed mb-4">
                Cada plataforma usa premissas ligeiramente diferentes:
              </p>
              <ul className="list-disc list-inside text-[13px] text-body space-y-1 mb-4">
                <li>
                  <strong>LPA ajustado vs as reported:</strong> algumas normalizam eventos não
                  recorrentes, outras não.
                </li>
                <li>
                  <strong>Classes de ação:</strong> empresas como PETR4 (PN) têm LPA
                  preferencial distinto da ON (PETR3). Sulfur usa um LPA único por empresa.
                </li>
                <li>
                  <strong>Dividend Yield:</strong> JCP (Juros sobre Capital Próprio) é
                  contabilizado de forma diferente — alguns providers aplicam benefício
                  fiscal.
                </li>
                <li>
                  <strong>Corte temporal:</strong> "TTM" pode incluir diferentes meses
                  dependendo de quando a plataforma puxou os dados.
                </li>
              </ul>
              <p className="text-[13.5px] text-body leading-relaxed">
                Divergências de até 30% entre plataformas são normais e não indicam erro.
                Use o Sulfur para tendência, comparabilidade temporal e estrutura — não como
                fonte única de decisão.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
