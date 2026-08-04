"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type SelectableItem = {
  symbol: string;
  name?: string;
  type?: "stock" | "etf" | "crypto" | "index";
};

type SelectionContextValue = {
  selected: SelectableItem[];
  isSelected: (symbol: string) => boolean;
  toggle: (item: SelectableItem) => void;
  remove: (symbol: string) => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectableItem[]>([]);

  const isSelected = useCallback(
    (symbol: string) => selected.some((s) => s.symbol === symbol),
    [selected],
  );

  const toggle = useCallback((item: SelectableItem) => {
    setSelected((prev) => {
      const exists = prev.some((s) => s.symbol === item.symbol);
      if (exists) return prev.filter((s) => s.symbol !== item.symbol);
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    setSelected((prev) => prev.filter((s) => s.symbol !== symbol));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const value = useMemo(
    () => ({ selected, isSelected, toggle, remove, clear }),
    [selected, isSelected, toggle, remove, clear],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error("useSelection must be used inside SelectionProvider");
  }
  return ctx;
}
