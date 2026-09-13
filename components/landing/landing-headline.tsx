"use client";

/**
 * LandingHeadline — frase central com typewriter effect.
 *
 * Implementação:
 *   - useState index avança 1 a cada X ms.
 *   - Cursor "_" pisca com CSS keyframes.
 *   - Loop onFinished (1.5s pausa → apaga → digita de novo)
 *     pra página inativa não ficar estática se user demora pra scrollar.
 *
 * Tokens:
 *   - Arquvo Black (já em next/font), clamp(2.5rem, 7vw, 6rem)
 *   - text-balance pra quebra de linha elegante em pt-BR
 *   - text-foreground (claro no dark)
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PHRASE = "Todas as informações que você precisa em um só lugar.";

const TYPING_MS = 45; // tempo por caractere digitando
const PAUSE_AFTER_MS = 2200; // pausa quando termina de digitar

export function LandingHeadline() {
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (paused) {
      timeout = setTimeout(() => {
        setPaused(false);
        setDeleting(true);
      }, PAUSE_AFTER_MS);
    } else if (deleting && index === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
      }, 250);
    } else if (!deleting && index === PHRASE.length) {
      timeout = setTimeout(() => setPaused(true), 100);
    } else {
      const nextIdx = deleting ? index - 1 : index + 1;
      const delay = deleting ? TYPING_MS / 1.6 : TYPING_MS;
      timeout = setTimeout(() => {
        setIndex(nextIdx);
      }, delay);
    }

    return () => clearTimeout(timeout);
  }, [index, deleting, paused]);

  return (
    <h1
      className={cn(
        "max-w-3xl text-center font-display font-black",
        "text-balance leading-[1.1] tracking-[-0.02em]",
        "text-[clamp(2.25rem,7vw,5.5rem)] text-foreground",
      )}
      aria-label={PHRASE}
    >
      <span aria-hidden="true">
        {PHRASE.slice(0, index)}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-1 inline-block h-[0.9em] w-[0.06em] translate-y-[0.05em] align-baseline",
          "bg-foreground",
          "animate-blink",
        )}
      />
    </h1>
  );
}
