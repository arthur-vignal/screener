import Link from "next/link";
import { ArrowRight, TrendingUp, PieChart, Bitcoin, Search, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-1px)] px-8 py-16">
      <div className="max-w-3xl w-full animate-fade-in">
        <div className="mb-12">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-3">
            Bem-vindo
          </h1>
          <p className="text-text-secondary text-lg">
            Selecione um universo na barra lateral pra começar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NavCard
            href="/screen/stocks"
            icon={TrendingUp}
            title="Ações"
            description="Lista filtrada de ações dos EUA com P/E, mcap, dividend yield e mais."
          />
          <NavCard
            href="/screen/etfs"
            icon={PieChart}
            title="ETFs"
            description="Lista de ETFs com yield, expense ratio e AUM."
          />
          <NavCard
            href="/screen/crypto"
            icon={Bitcoin}
            title="Crypto"
            description="Top projetos de cripto com market cap e dominância."
          />
          <NavCard
            href="/search"
            icon={Search}
            title="Buscar"
            description="Filtros estruturados pra refinar a busca."
          />
          <NavCard
            href="/watchlist"
            icon={Star}
            title="Watchlist"
            description="Sua lista de ativos pra acompanhar."
          />
        </div>
      </div>
    </div>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-5 rounded-lg border border-border bg-surface hover:border-foreground/30 hover:bg-surface-elevated transition-all"
    >
      <div className="shrink-0 w-9 h-9 rounded-md bg-surface-elevated border border-border flex items-center justify-center text-text-secondary group-hover:text-foreground transition-colors">
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-foreground">{title}</h3>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
