import { useEffect, useState } from "react";

export type WeightHistoryRange = "1m" | "3m" | "6m" | "1y" | "all";

const STORAGE_KEY = "pet-weight-history-range";
const DEFAULT_RANGE: WeightHistoryRange = "all";

function isWeightHistoryRange(value: unknown): value is WeightHistoryRange {
  return value === "1m" || value === "3m" || value === "6m" || value === "1y" || value === "all";
}

function loadStoredRange(): WeightHistoryRange {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isWeightHistoryRange(stored) ? stored : DEFAULT_RANGE;
  } catch {
    return DEFAULT_RANGE;
  }
}

export function useWeightHistoryRange() {
  const [range, setRange] = useState<WeightHistoryRange>(loadStoredRange);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, range);
    } catch {
      // ignore storage errors
    }
  }, [range]);

  return { range, setRange };
}
