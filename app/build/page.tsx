import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function BuildPage() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-14 max-w-3xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Construction className="w-7 h-7 text-muted" />
            Em construção
          </span>
        }
        description="Esta seção está em desenvolvimento. Volta aqui em breve — temos features interessantes planejadas."
      />
      <div className="panel p-10 text-center">
        <Construction className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
        <h2 className="font-display text-2xl text-ink mb-2">Em breve</h2>
        <p className="text-sm text-muted max-w-md mx-auto">
          Estamos trabalhando em algo aqui. Pode incluir portfolio builder drag-and-drop,
          backtesting engine, ou outras ferramentas avançadas.
        </p>
      </div>
    </div>
  );
}
