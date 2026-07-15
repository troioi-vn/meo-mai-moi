import type {
  Ledger,
  LedgerAccount,
  LedgerCategory,
  LedgerTransaction,
  TransactionPage,
} from '@/api/finance'

export const financeLedger: Ledger = {
  id: 7,
  title: 'Catarchy Rescue',
  currency_code: 'VND',
  currency: { code: 'VND', name: 'Dong', symbol: '₫', minor_units: 0 },
  group_id: null,
  sync_group_pets: false,
  archived_at: null,
  member_count: 1,
  pet_count: 1,
}

export const cashAccount: LedgerAccount = {
  id: 11,
  name: 'Cash box',
  archived_at: null,
  income_minor: 2_000_000,
  expense_minor: 500_000,
  net_activity_minor: 1_500_000,
}

export const veterinaryCategory: LedgerCategory = {
  id: 21,
  name: 'Veterinary care',
  applies_to: 'expense',
  archived_at: null,
}

export const veterinaryTransaction: LedgerTransaction = {
  id: 31,
  ledger_id: financeLedger.id,
  type: 'expense',
  amount_minor: 350_000,
  amount: '350000',
  occurred_on: '2026-07-15',
  description: 'Annual check-up',
  account_id: cashAccount.id,
  account_name: cashAccount.name,
  category_id: veterinaryCategory.id,
  category_name: veterinaryCategory.name,
  pets: [{ id: 41, name: 'Miso', name_snapshot: 'Miso' }],
  created_by: { id: 51, name: 'Athanasius' },
  has_receipt: false,
}

export const transactionPage = (items: LedgerTransaction[]): TransactionPage => ({
  items,
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: items.length,
})
