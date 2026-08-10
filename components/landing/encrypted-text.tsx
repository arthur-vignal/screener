"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+=?/<>";

/**
 * EncryptedText — when the prop `reveal` flips to true, the text
 * starts as random glyphs and resolves to the final character-by-
 * character (per the aceternity demo).
 */
export function EncryptedText({
  text,
  reveal,
  className,
  speed = 35,
}: {
  text: string;
  reveal: boolean;
  className?: string;
  speed?: number; // ms per step
}) {
  const [display, setDisplay] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!reveal) {
      setDisplay("·".repeat(text.length));
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const iterations = Math.max(8, Math.ceil(800 / speed));
    let frame = 0;

    function tick() {
      if (cancelled) return;
      const next = text
        .split("")
        .map((char, i) => {
          if (frame >= iterations) return char;
          if (char === " ") return " ";
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setDisplay(next);
      frame += 1;
      if (frame < iterations + text.length * 0.6) {
        setTimeout(tick, speed);
      } else {
        setDisplay(text);
      }
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [reveal, text, speed]);

  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontFeatureSettings: "'tnum' 1, 'zero' 1",
      }}
    >
      {display}
    </span>
  );
}
