import { ChevronRight, Keyboard, MessageSquare, Star, FileText } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Support — lista de links de ajuda. Cada item tem ícone + título +
 * descrição curta + chevron à direita. Render como <a target="_blank">
 * pra links externos; âncoras internas são <Link>.
 *
 * Sem deps novas, sem Sheet/Dialog — lista estática.
 */

type Item = {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; size?: number | string }>;
  external?: boolean;
};

const ITEMS: Item[] = [
  {
    href: "https://sulfur.io/docs/shortcuts",
    title: "Shortcuts cheat sheet",
    description: "Atalhos de teclado pra navegar o app inteiro.",
    Icon: Keyboard,
    external: true,
  },
  {
    href: "https://sulfur.io/support",
    title: "Talk to us",
    description: "Suporte humano por chat — resposta em até 24h.",
    Icon: MessageSquare,
    external: true,
  },
  {
    href: "https://sulfur.io/feedback",
    title: "Share feedback",
    description: "Sugestões, bugs e idéias — a gente lê tudo.",
    Icon: Star,
    external: true,
  },
  {
    href: "https://sulfur.io/docs",
    title: "Documentation",
    description: "Guias, API reference e changelog completo.",
    Icon: FileText,
    external: true,
  },
];

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl fey-card p-2">
        <ul className="flex flex-col">
          {ITEMS.map((it) => {
            const Comp: React.ElementType = "a";
            return (
              <li key={it.href}>
                <Comp
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  rel={it.external ? "noreferrer" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-3 transition-colors",
                    "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.04] text-muted-foreground group-hover:text-foreground">
                    <it.Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {it.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {it.description}
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-muted-foreground group-hover:text-foreground"
                  />
                </Comp>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="px-1 text-xs text-muted-foreground">
        Problemas críticos? Mande email pra{" "}
        <a
          href="mailto:support@sulfur.io"
          className="text-foreground underline-offset-4 hover:underline"
        >
          support@sulfur.io
        </a>
        .
      </p>
    </div>
  );
}
