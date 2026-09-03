import { AnalysisTabs } from "./analysis-tabs";

/**
 * /analysis — dashboard macro da B3 (global, sem asset específico).
 *
 * É a "Economics + Markets" do Fey, adaptada pra Brasil.
 *
 * Estrutura:
 *   - SubHeader local: tabs Macro | Markets (no header sticky)
 *   - Cada tab renderiza seu próprio conjunto de cards
 *
 * Server component: delega o controle de state da tab para o cliente.
 *
 * Querystring opcional:
 *   ?tab=macro|markets  (default: macro)
 */

export const metadata = {
  title: "Análise Macro · Sulfur",
  description: "Panorama macro da B3: juros, inflação, índices e calendário.",
};

export default function AnalysisPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        <AnalysisTabs />
      </div>
    </div>
  );
}
