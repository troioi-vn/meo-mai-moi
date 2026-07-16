import { formatMoneyMinor, type Ledger } from '@/api/finance'

export const formatLedgerMoney = (amount: number, ledger: Ledger, locale: string) =>
  formatMoneyMinor(amount, ledger.currency, locale)
