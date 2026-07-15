export const financeAreas = [
  'overview',
  'transactions',
  'accounts',
  'categories',
  'pets',
  'members',
  'settings',
] as const

export type FinanceArea = (typeof financeAreas)[number]

export function isFinanceArea(value: string | undefined): value is FinanceArea {
  return financeAreas.some((area) => area === value)
}

export const financePath = (ledgerId: number, area: FinanceArea = 'overview') =>
  `/finance/${String(ledgerId)}/${area}`
