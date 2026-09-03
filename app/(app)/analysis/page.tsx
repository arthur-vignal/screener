import { Suspense } from "react";

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
 *
 * NOTA: <AnalysisTabs> usa useSearchParams (Next.js 15+). Pra
 * prerender funcionar, ele é envolvido em <Suspense> com skeleton.
 */

export const metadata = {
  title: "Análise Macro · Sulfur",
  description: "Panorama macro da B3: juros, inflação, índices e calendário.",
};

export default function AnalysisPage() {
  return (
    <div className="min-h-screen text-foreground" style={{ background: "#070709" }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8 pb-32">
        <Suspense fallback={<AnalysisTabsSkeleton />}>
          <AnalysisTabs />
        </Suspense>
      </div>
    </div>
  );
}

function AnalysisTabsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-8 w-32 rounded-full bg-white/[0.06] animate-pulse" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[200px] rounded-2xl border border-white/5 bg-[#101116] animate-pulse"
        />
      ))}
    </div>
  );
}
