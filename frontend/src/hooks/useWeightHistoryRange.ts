import { usePersistedChoice } from './use-persisted-choice'

export type WeightHistoryRange = '1m' | '3m' | '6m' | '1y' | 'all'

const STORAGE_KEY = 'pet-weight-history-range'
const DEFAULT_RANGE: WeightHistoryRange = 'all'

function isWeightHistoryRange(value: unknown): value is WeightHistoryRange {
  return value === '1m' || value === '3m' || value === '6m' || value === '1y' || value === 'all'
}

export function useWeightHistoryRange() {
  const [range, setRange] = usePersistedChoice(STORAGE_KEY, DEFAULT_RANGE, isWeightHistoryRange)

  return { range, setRange }
}
