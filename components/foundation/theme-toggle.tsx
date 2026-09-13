"use client";

/**
 * ThemeToggle — botão sun/moon pra alternar dark/light.
 *
 * Montado como pill de 40×40 com fundo semi-transparente (cristal,
 * mesma linguagem visual do .fey-dock). Ícone muda com `useTheme`:
 *   - dark (default) → exibe sun (vai clarear)
 *   - light → exibe moon (vai escurecer)
 *
 * Renderização: client-only (`useTheme` precisa de hidratação). Pra
 * evitar flash de ícone errado em SSR, monta um skeleton do mesmo
 * tamanho na primeira renderização e troca pelo real no `mounted`.
 */

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { JSX } from "react";

export function ThemeToggle(): JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pré-hidratação: skeleton neutro (mesma largura/altura pra evitar layout shift)
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema"
        className="h-10 w-10 rounded-full fey-dock-sm flex items-center justify-center"
        disabled
      />
    );
  }

  const isLight = resolvedTheme === "light";

  return (
    <button
      type="button"
      aria-label={isLight ? "Mudar pra tema escuro" : "Mudar pra tema claro"}
      title={isLight ? "Tema escuro" : "Tema claro"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="h-10 w-10 rounded-full fey-dock-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
    >
      {isLight ? (
        <Moon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
      ) : (
        <Sun className="h-4 w-4 text-foreground" strokeWidth={1.5} />
      )}
    </button>
  );
}
