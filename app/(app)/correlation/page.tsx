import { CorrelationHeatmap } from "@/components/correlation-heatmap";
import { PageHeader } from "@/components/page-header";
import { Grid3x3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CorrelationPage() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-7xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Grid3x3 className="w-7 h-7 text-brand-deep" />
            Correlação
          </span>
        }
        description="Matriz de correlação de Pearson entre ativos. 1Y de retornos diários. Passe o mouse para destacar linha/coluna. Atualiza a cada 1h."
      />
      <CorrelationHeatmap />
    </div>
  );
}
