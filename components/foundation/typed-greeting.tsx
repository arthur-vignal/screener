"use client";

/**
 * TypedGreeting — "Bom dia/tarde/noite, {nome}" com typewriter.
 *
 * Padrão da skill advanced-react-motion-auth-flows §4:
 *   - useState começa vazio (evita flash "Convidado")
 *   - useEffect com setInterval avança 1 char a cada 50ms
 *   - motion.span caret piscando enquanto não terminou
 *   - mounted gate (evita hydration mismatch com infinite-repeat)
 *
 * Greeting é automático baseado na hora local:
 *   0-5:  "Boa madrugada"
 *   6-11: "Bom dia"
 *   12-17:"Boa tarde"
 *   18-23:"Boa noite"
 */

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

type Props = {
  name: string;
  /** Tamanho da fonte. Default: 32 (display). */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[20px]",
  md: "text-[24px]",
  lg: "text-[32px]",
  xl: "text-[40px]",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function TypedGreeting({
  name,
  size = "lg",
  className,
}: Props): JSX.Element | null {
  // prefix é derivado da hora atual (muda a cada hora). Memoiza pra
  // não criar uma string nova a cada render — se virasse dep do useEffect
  // do typewriter, dispararia o setInterval cleanup a cada re-render.
  const prefix = useMemo(() => `${greeting()}, `, []);

  // fullText derivado: só pra length check + early return. NUNCA
  // usado como dep de useEffect (causaria re-entrancia).
  const fullText = name ? `${prefix}${name}` : prefix;

  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Gate hydration: caret só monta no client (regra da skill §infinite-repeat)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Typewriter loop. Deps: `prefix` (memoizada — muda só a cada hora)
  // e `name` (string estável do parent). NUNCA `fullText` direto —
  // string nova a cada render dispararia este useEffect a cada
  // 38ms do setInterval, causando re-entrancia que trava o browser.
  useEffect(() => {
    setTyped("");
    setDone(false);
    let i = 0;
    const target = `${prefix}${name}`;
    if (!name) return;
    const interval = setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 38);
    return () => clearInterval(interval);
  }, [name, prefix]);

  // Se ainda não tem nome, retorna null (evita flash "Convidado").
  if (!name) return null;

  const prefixLen = prefix.length;
  const prefixDone = typed.length >= prefixLen;
  const restTyped = prefixDone ? typed.slice(prefixLen) : "";

  return (
    <h1
      className={cn(
        "font-semibold tracking-tight leading-tight",
        sizeMap[size],
        className
      )}
    >
      <span className="text-foreground">{prefixDone ? prefix : typed}</span>
      {prefixDone && restTyped && (
        <span className="text-foreground font-bold"> {restTyped}</span>
      )}
      {mounted && !done && (
        <motion.span
          className="inline-block w-[2px] h-[0.85em] align-middle ml-1 bg-current"
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 0.85,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
    </h1>
  );
}
