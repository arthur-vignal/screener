import type { JSX } from "react";

/**
 * Skeleton — placeholder com a forma do conteúdo final.
 *
 * Regra (sulfur-ui-rules §5.1): skeleton com mesma altura/largura/posição
 * do conteúdo final. NUNCA spinner centralizado.
 */

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Largura. Default: "100%". Aceita string Tailwind ("w-32") ou CSS. */
  width?: string;
  /** Altura. Default: "h-4". */
  height?: string;
  /** Se true, usa rounded-full (apenas para avatares circulares). */
  roundedFull?: boolean;
  /** Se true, força rounded-md ao invés de rounded (default é rounded-sm sutil). */
  roundedMd?: boolean;
};

export function Skeleton({
  className,
  width,
  height,
  roundedFull,
  roundedMd,
}: Props): JSX.Element {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/[0.04]",
        roundedFull ? "rounded-full" : roundedMd ? "rounded-md" : "rounded-sm",
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
