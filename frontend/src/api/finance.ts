import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteLedgersLedger,
  deleteLedgersLedgerGroupLink,
  deleteLedgersLedgerInvitationsInvitation,
  deleteLedgersLedgerMembersUser,
  deleteLedgersLedgerPetsPet,
  deleteLedgersLedgerTransactionsTransaction,
  deleteLedgersLedgerTransactionsTransactionReceipt,
  getCurrencies,
  getLedgers,
  getLedgersLedger,
  getLedgersLedgerAccounts,
  getLedgersLedgerCategories,
  getLedgersLedgerDashboard,
  getLedgersLedgerInvitations,
  getLedgersLedgerMemberSuggestions,
  getLedgersLedgerMembers,
  getLedgersLedgerPets,
  getLedgersLedgerTransactions,
  getPetsPetFinanceTransactions,
  postLedgers,
  postLedgersLedgerAccounts,
  postLedgersLedgerAccountsAccountArchive,
  postLedgersLedgerArchive,
  postLedgersLedgerCategories,
  postLedgersLedgerCategoriesCategoryArchive,
  postLedgersLedgerGroupLink,
  postLedgersLedgerInvitations,
  postLedgersLedgerLeave,
  postLedgersLedgerMembers,
  postLedgersLedgerPetsPet,
  postLedgersLedgerRestore,
  postLedgersLedgerTransactions,
  postLedgersLedgerTransactionsTransactionReceipt,
  putLedgersLedger,
  putLedgersLedgerAccountsAccount,
  putLedgersLedgerCategoriesCategory,
  putLedgersLedgerTransactionsTransaction,
} from '@/api/generated/finances/finances'

export interface Currency {
  code: string
  name: string
  symbol: string
  minor_units: number
}
export interface Ledger {
  id: number
  title: string
  currency_code: string
  currency: Currency
  group_id: number | null
  sync_group_pets: boolean
  archived_at: string | null
  member_count: number
  pet_count: number
  can_delete: boolean
}
export interface LedgerAccount {
  id: number
  name: string
  archived_at: string | null
  income_minor: number
  expense_minor: number
  net_activity_minor: number
}
export interface LedgerCategory {
  id: number
  name: string
  applies_to: 'income' | 'expense' | 'both'
  archived_at: string | null
}
export interface LedgerPet {
  id: number
  name: string
  photo_url?: string | null
  can_view_profile: boolean
  sources: string[]
  income_minor?: number
  expense_minor?: number
  net_activity_minor?: number
}
export interface LedgerTransaction {
  id: number
  ledger_id: number
  type: 'income' | 'expense'
  amount_minor: number
  amount: string
  occurred_on: string
  description: string | null
  account_id: number
  account_name: string
  category_id: number | null
  category_name: string | null
  pets: { id: number | null; name: string; name_snapshot: string }[]
  created_by: { id: number; name: string }
  has_receipt: boolean
}
export interface TransactionPage {
  items: LedgerTransaction[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
export interface Dashboard {
  current_month: { income: number; expense: number; net_activity: number }
  previous_month: { income: number; expense: number }
  accounts: LedgerAccount[]
  recent_transactions: LedgerTransaction[]
  spending_by_category: { id: number | null; name: string; total: number }[]
  income_by_category: { id: number | null; name: string; total: number }[]
  spending_by_pet: { id: number | null; name: string; total: number }[]
  monthly_trend: { month: string; income: number; expense: number }[]
}
export interface LedgerInvitation {
  id: number
  token: string
  status: string
  expires_at: string
  invitation_url: string
}
export interface SharingSuggestion {
  id: number
  name: string
}

export async function listLedgerMemberSuggestions(id: number): Promise<SharingSuggestion[]> {
  return getLedgersLedgerMemberSuggestions(id)
}

export async function addLedgerMember(id: number, userId: number): Promise<void> {
  await postLedgersLedgerMembers(id, { user_id: userId })
}

const keys = {
  ledgers: ['finance', 'ledgers'] as const,
  ledger: (id: number) => ['finance', 'ledger', id] as const,
  transactions: (id: number) => ['finance', 'transactions', id] as const,
}
export const useCurrencies = () =>
  useQuery({
    queryKey: ['finance', 'currencies'],
    queryFn: () => getCurrencies() as Promise<Currency[]>,
  })
export const useLedgers = (archived = false) =>
  useQuery({
    queryKey: [...keys.ledgers, archived],
    queryFn: () => getLedgers(archived ? { archived: true } : undefined) as Promise<Ledger[]>,
  })
export const useLedger = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'ledger', id],
    queryFn: () => getLedgersLedger(id ?? 0) as Promise<Ledger>,
    enabled: id != null,
  })
export const useAccounts = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'accounts', id],
    queryFn: () => getLedgersLedgerAccounts(id ?? 0) as Promise<LedgerAccount[]>,
    enabled: id != null,
  })
export const useCategories = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'categories', id],
    queryFn: () => getLedgersLedgerCategories(id ?? 0) as Promise<LedgerCategory[]>,
    enabled: id != null,
  })
export const useLedgerPets = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'pets', id],
    queryFn: () => getLedgersLedgerPets(id ?? 0) as Promise<LedgerPet[]>,
    enabled: id != null,
  })
export const useTransactions = (id: number | null, filters: Record<string, string> = {}) =>
  useQuery({
    queryKey: [...keys.transactions(id ?? 0), filters],
    queryFn: () => getLedgersLedgerTransactions(id ?? 0, filters) as Promise<TransactionPage>,
    enabled: id != null,
  })
export const useDashboard = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'dashboard', id],
    queryFn: () => getLedgersLedgerDashboard(id ?? 0) as Promise<Dashboard>,
    enabled: id != null,
  })
export const useMembers = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'members', id],
    queryFn: () =>
      getLedgersLedgerMembers(id ?? 0) as Promise<
        { user_id: number; name: string; start_at: string }[]
      >,
    enabled: id != null,
  })
export const useLedgerInvitations = (id: number | null) =>
  useQuery({
    queryKey: ['finance', 'invitations', id],
    queryFn: () => getLedgersLedgerInvitations(id ?? 0) as Promise<LedgerInvitation[]>,
    enabled: id != null,
  })

export function useCreateLedger() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; currency_code: string }) =>
      postLedgers(body) as Promise<Ledger>,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.ledgers })
    },
  })
}
export function useUpdateLedger(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title?: string; currency_code?: string }) =>
      putLedgersLedger(id, body) as Promise<Ledger>,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.ledgers })
    },
  })
}
export function useRestoreLedger(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLedgersLedgerRestore(id) as Promise<Ledger>,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.ledgers })
    },
  })
}
export function useDeleteLedger(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteLedgersLedger(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.ledgers })
    },
  })
}
export function useCreateTransaction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      type: 'income' | 'expense'
      amount: string
      occurred_on: string
      account_id: number
      category_id?: number | null
      description?: string
      pet_ids?: number[]
    }) => postLedgersLedgerTransactions(id, body) as Promise<LedgerTransaction>,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.transactions(id) }),
        qc.invalidateQueries({ queryKey: ['finance', 'dashboard', id] }),
        qc.invalidateQueries({ queryKey: ['finance', 'accounts', id] }),
      ])
    },
  })
}
export function useDeleteTransaction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transactionId: number) =>
      deleteLedgersLedgerTransactionsTransaction(id, transactionId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.transactions(id) }),
        qc.invalidateQueries({ queryKey: ['finance', 'dashboard', id] }),
      ])
    },
  })
}
export function useUpdateTransaction(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      transactionId,
      body,
    }: {
      transactionId: number
      body: {
        type: 'income' | 'expense'
        amount: string
        occurred_on: string
        account_id: number
        category_id?: number | null
        description?: string
        pet_ids?: number[]
      }
    }) =>
      putLedgersLedgerTransactionsTransaction(
        id,
        transactionId,
        body
      ) as Promise<LedgerTransaction>,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: keys.transactions(id) }),
        qc.invalidateQueries({ queryKey: ['finance', 'dashboard', id] }),
        qc.invalidateQueries({ queryKey: ['finance', 'accounts', id] }),
      ])
    },
  })
}
export function useUploadReceipt(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: number; file: File }) => {
      return postLedgersLedgerTransactionsTransactionReceipt(id, transactionId, { receipt: file })
    },
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.transactions(id) }),
  })
}
export function useDeleteReceipt(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transactionId: number) =>
      deleteLedgersLedgerTransactionsTransactionReceipt(id, transactionId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.transactions(id) }),
  })
}
export const receiptUrl = (ledgerId: number, transactionId: number) =>
  `/api/ledgers/${String(ledgerId)}/transactions/${String(transactionId)}/receipt`
export function useCreateAccount(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => postLedgersLedgerAccounts(id, { name }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['finance', 'accounts', id] })
    },
  })
}
export function useUpdateAccount(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, name }: { accountId: number; name: string }) =>
      putLedgersLedgerAccountsAccount(id, accountId, { name }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'accounts', id] }),
  })
}
export function useArchiveAccount(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (accountId: number) => postLedgersLedgerAccountsAccountArchive(id, accountId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'accounts', id] }),
  })
}
export function useCreateCategory(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; applies_to: string }) =>
      postLedgersLedgerCategories(
        id,
        body as { name: string; applies_to: 'income' | 'expense' | 'both' }
      ),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['finance', 'categories', id] })
    },
  })
}
export function useUpdateCategory(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      body,
    }: {
      categoryId: number
      body: { name: string; applies_to: string }
    }) =>
      putLedgersLedgerCategoriesCategory(
        id,
        categoryId,
        body as { name?: string; applies_to?: 'income' | 'expense' | 'both' }
      ),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'categories', id] }),
  })
}
export function useArchiveCategory(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: number) => postLedgersLedgerCategoriesCategoryArchive(id, categoryId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'categories', id] }),
  })
}
export function useArchiveLedger(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLedgersLedgerArchive(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.ledgers })
    },
  })
}
export function useCreateLedgerInvitation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      postLedgersLedgerInvitations(id) as Promise<{
        invitation: LedgerInvitation
        invitation_url: string
      }>,
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'invitations', id] }),
  })
}
export function useRevokeLedgerInvitation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: number) =>
      deleteLedgersLedgerInvitationsInvitation(id, invitationId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'invitations', id] }),
  })
}
export function useRemoveLedgerMember(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => deleteLedgersLedgerMembersUser(id, userId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['finance', 'members', id] }),
        qc.invalidateQueries({ queryKey: keys.ledgers }),
      ])
    },
  })
}
export function useAddLedgerMember(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => addLedgerMember(id, userId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['finance', 'members', id] }),
        qc.invalidateQueries({ queryKey: keys.ledgers }),
      ])
    },
  })
}
export function useLeaveLedger(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLedgersLedgerLeave(id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.ledgers }),
  })
}
export function useAddLedgerPet(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (petId: number) => postLedgersLedgerPetsPet(id, petId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'pets', id] }),
  })
}
export function useRemoveLedgerPet(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (petId: number) => deleteLedgersLedgerPetsPet(id, petId),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['finance', 'pets', id] }),
  })
}
export function useLinkLedgerGroup(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { group_id: number; import_pets: boolean; sync_group_pets: boolean }) =>
      postLedgersLedgerGroupLink(id, body),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.ledgers }),
  })
}
export function useUnlinkLedgerGroup(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteLedgersLedgerGroupLink(id),
    onSuccess: async () => qc.invalidateQueries({ queryKey: keys.ledgers }),
  })
}
export const usePetFinanceTransactions = (petId: number) =>
  useQuery({
    queryKey: ['finance', 'pet-transactions', petId],
    queryFn: () => getPetsPetFinanceTransactions(petId) as Promise<TransactionPage>,
    enabled: petId > 0,
  })

export function formatMoneyMinor(amountMinor: number, currency: Currency, locale: string): string {
  const negative = amountMinor < 0
  const digits = String(Math.abs(amountMinor)).padStart(currency.minor_units + 1, '0')
  const split = digits.length - currency.minor_units
  const major =
    currency.minor_units === 0 ? digits : `${digits.slice(0, split)}.${digits.slice(split)}`
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.minor_units,
    maximumFractionDigits: currency.minor_units,
  }).format(`${negative ? '-' : ''}${major}` as unknown as number)
}
