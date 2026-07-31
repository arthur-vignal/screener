"use client";

/**
 * Watchlist hook backed by localStorage.
 * Sync across tabs via 'storage' event.
 * Schema: { tickers: string[] }
 */

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "screener:watchlist";

type State = {
  tickers: string[];
};

function readStorage(): State {
  if (typeof window === "undefined") return { tickers: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tickers: [] };
    const parsed = JSON.parse(raw) as State;
    if (!Array.isArray(parsed.tickers)) return { tickers: [] };
    return { tickers: parsed.tickers.filter((t) => typeof t === "string") };
  } catch {
    return { tickers: [] };
  }
}

function writeStorage(state: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY,
      newValue: JSON.stringify(state),
    }));
  } catch {
    // ignore quota errors
  }
}

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const s = readStorage();
    setTickers(s.tickers);
    setLoaded(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const s = readStorage();
        setTickers(s.tickers);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase().trim();
    if (!upper) return;
    setTickers((prev) => {
      if (prev.includes(upper)) return prev;
      const next = [...prev, upper];
      writeStorage({ tickers: next });
      return next;
    });
  }, []);

  const remove = useCallback((ticker: string) => {
    const upper = ticker.toUpperCase().trim();
    setTickers((prev) => {
      const next = prev.filter((t) => t !== upper);
      writeStorage({ tickers: next });
      return next;
    });
  }, []);

  const has = useCallback(
    (ticker: string) => tickers.includes(ticker.toUpperCase().trim()),
    [tickers],
  );

  const clear = useCallback(() => {
    setTickers([]);
    writeStorage({ tickers: [] });
  }, []);

  return { tickers, add, remove, has, clear, loaded };
}
