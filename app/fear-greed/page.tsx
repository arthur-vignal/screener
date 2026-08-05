import { FearGreedGauge } from "@/components/fear-greed";
import { PageHeader } from "@/components/page-header";
import { Gauge } from "lucide-react";

export const dynamic = "force-dynamic";

export default function FearGreedPage() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Gauge className="w-7 h-7 text-brand-deep" />
            Fear & Greed Index
          </span>
        }
        description="Indicador composto de sentimento de mercado. 0 = medo extremo, 100 = ganância extrema. Calculado em tempo real com 5 componentes: volatilidade, momentum, breadth, safe haven, junk bond demand."
      />
      <FearGreedGauge />
      <div className="mt-6 text-xs text-muted">
        Atualiza a cada 5 minutos via /api/fear-greed. Componentes individuais
        atualizados em cache por 10 min.
      </div>
    </div>
  );
}
