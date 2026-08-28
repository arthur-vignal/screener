"use client";

/**
 * TypeFilter — segmented control "Ações | FIIs | ETFs | BDRs".
 *
 * Wrapper do <SegmentedControl> da foundation com os 4 tipos de ativo
 * B3 pré-configurados. Default: "stock".
 */

import type { JSX } from "react";

import { SegmentedControl } from "@/components/foundation/segmented-control";

export type AssetType = "stock" | "fii" | "etf" | "bdr";

type Props = {
  value: AssetType;
  onChange: (v: AssetType) => void;
  className?: string;
};

export function TypeFilter({ value, onChange, className }: Props): JSX.Element {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as AssetType)}
      segments={[
        { value: "stock", label: "Ações" },
        { value: "fii", label: "FIIs" },
        { value: "etf", label: "ETFs" },
        { value: "bdr", label: "BDRs" },
      ]}
      className={className}
    />
  );
}
