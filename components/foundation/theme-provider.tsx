"use client";

/**
 * ThemeProvider — wrapper de `next-themes` calibrado pro Sulfur.
 *
 * Decisões:
 * - defaultTheme="dark": preserva visual validado em prod. Light é opt-in.
 * - attribute="data-theme": o CSS já tem `:root[data-theme="light"]` e
 *   `:root[data-theme="dark"]`. Funciona ao lado de `:root.light`/`.dark`
 *   que next-themes não usa mas outros lugares do projeto podem ter.
 * - enableSystem=false: sem flash entre temas baseado em media query.
 *   Sulfur já tem @media (prefers-color-scheme: dark) no globals.css
 *   pra fallback OS-level, mas o toggle é a única fonte de verdade.
 * - storageKey="sulfur-theme": persiste em localStorage entre sessões.
 */

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps, JSX } from "react";

type NextThemesProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({
  children,
  ...props
}: NextThemesProps): JSX.Element {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="sulfur-theme"
      themes={["dark", "light"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
