"use client";

/**
 * Watchlist hook backed by localStorage.
 * Sync across tabs via 'storage' event.
 */

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "screener:watchlist";

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { tickers?: string[] };
    if (!Array.isArray(parsed.tickers)) return [];
    return parsed.tickers.filter((t) => typeof t === "string");
  } catch {
    return [];
  }
}

function writeStorage(tickers: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ tickers }));
  } catch {
    // ignore quota errors
  }
}

export function useWatchlist() {
  // Initialize from localStorage synchronously (avoids effect-based setState).
  const [tickers, setTickersState] = useState<string[]>(() => readStorage());

  // Cross-tab sync only — no setState in effect body, just subscribe.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setTickersState(readStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTickers = useCallback((updater: (prev: string[]) => string[]) => {
    setTickersState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      writeStorage(next);
      return next;
    });
  }, []);

  const add = useCallback(
    (ticker: string) => {
      const upper = ticker.toUpperCase().trim();
      if (!upper) return;
      setTickers((prev) => (prev.includes(upper) ? prev : [...prev, upper]));
    },
    [setTickers],
  );

  const remove = useCallback(
    (ticker: string) => {
      const upper = ticker.toUpperCase().trim();
      setTickers((prev) => prev.filter((t) => t !== upper));
    },
    [setTickers],
  );

  const has = useCallback(
    (ticker: string) => tickers.includes(ticker.toUpperCase().trim()),
    [tickers],
  );

  const clear = useCallback(() => {
    setTickers(() => []);
  }, [setTickers]);

  return { tickers, add, remove, has, clear };
}
