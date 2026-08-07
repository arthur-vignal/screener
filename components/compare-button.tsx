"use client";

/**
 * CompareButton — toggle button to add/remove a ticker from the user's
 * local "compare basket". The basket lives in localStorage so it survives
 * navigation across pages. Clicking when the basket has 2+ items opens
 * /compare?symbols=A,B,C — letting the user compare side-by-side.
 *
 * Max 5 tickers (UX guard — beyond that the compare table becomes unreadable).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitCompare, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sulfur:compare";
const MAX = 5;

function readBasket(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeBasket(symbols: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
    // Notify other components in the same tab (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent("sulfur:compare-changed"));
  } catch {
    // localStorage full or disabled — silent fail
  }
}

export function getCompareBasket(): string[] {
  return readBasket();
}

type Props = {
  symbol: string;
  className?: string;
};

export function CompareButton({ symbol, className }: Props) {
  const router = useRouter();
  const [inBasket, setInBasket] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const basket = readBasket();
      setInBasket(basket.includes(symbol));
      setCount(basket.length);
    };
    refresh();
    window.addEventListener("sulfur:compare-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("sulfur:compare-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [symbol]);

  function toggle() {
    if (loading) return;
    setLoading(true);
    const basket = readBasket();
    if (basket.includes(symbol)) {
      writeBasket(basket.filter((s) => s !== symbol));
    } else {
      if (basket.length >= MAX) {
        // Drop oldest to keep within cap (FIFO).
        writeBasket([...basket.slice(1), symbol]);
      } else {
        writeBasket([...basket, symbol]);
      }
    }
    // No async call — basket is local. Loading state is brief UX feedback.
    setTimeout(() => setLoading(false), 120);
  }

  function openCompare() {
    const basket = readBasket();
    const symbols = basket.includes(symbol) ? basket : [...basket, symbol];
    if (symbols.length < 2) return;
    router.push(`/compare?symbols=${symbols.join(",")}`);
  }

  const Icon = loading ? Loader2 : inBasket ? Check : GitCompare;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={
          inBasket
            ? `Remover ${symbol} da comparação`
            : `Adicionar ${symbol} à comparação`
        }
        aria-pressed={inBasket}
        className={cn(
          "btn-ghost flex items-center gap-1.5 press",
          inBasket && "text-brand-deep border-brand-deep/40",
          loading && "opacity-60",
        )}
      >
        <Icon
          className={cn("w-3 h-3", loading && "animate-spin")}
          strokeWidth={2}
        />
        Compare
      </button>
      {count >= 2 && (
        <button
          type="button"
          onClick={openCompare}
          className="btn-ghost text-brand-deep press label-s"
          aria-label={`Abrir comparação com ${count} ativos`}
        >
          ({count}) →
        </button>
      )}
    </div>
  );
}
