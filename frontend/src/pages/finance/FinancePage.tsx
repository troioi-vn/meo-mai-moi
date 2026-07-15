import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Pencil,
  Plus,
  QrCode,
  WalletCards,
} from 'lucide-react'
import {
  formatMoneyMinor,
  listLedgerMemberSuggestions,
  receiptUrl,
  useAddLedgerPet,
  useAddLedgerMember,
  useAccounts,
  useArchiveAccount,
  useArchiveCategory,
  useArchiveLedger,
  useCategories,
  useCreateAccount,
  useCreateCategory,
  useCreateLedgerInvitation,
  useCreateLedger,
  useCreateTransaction,
  useCurrencies,
  useDashboard,
  useDeleteTransaction,
  useDeleteLedger,
  useDeleteReceipt,
  useLedgers,
  useLedgerInvitations,
  useLedgerPets,
  useMembers,
  useLeaveLedger,
  useLinkLedgerGroup,
  useRemoveLedgerMember,
  useRemoveLedgerPet,
  useRestoreLedger,
  useRevokeLedgerInvitation,
  useTransactions,
  useUnlinkLedgerGroup,
  useUpdateAccount,
  useUpdateCategory,
  useUpdateLedger,
  useUpdateTransaction,
  useUploadReceipt,
  type Ledger,
  type LedgerTransaction,
} from '@/api/finance'
import { useGroups, useMyPetsSections } from '@/api/groups'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/LoadingState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ResourceSharingDialog,
  type SharingInvitation,
} from '@/components/sharing/ResourceSharingDialog'
import { RevokeInvitationDialog } from '@/components/sharing/RevokeInvitationDialog'
import { toast } from '@/lib/i18n-toast'

const SELECTION_KEY = 'meo-mai-moi.finance.ledger'

export default function FinancePage() {
  const { t } = useTranslation('finance')
  const { data: ledgers, isLoading } = useLedgers()
  const { data: archived } = useLedgers(true)
  const [selectedId, setSelectedId] = useState<number | null>(
    () => Number(localStorage.getItem(SELECTION_KEY)) || null
  )
  const [setupOpen, setSetupOpen] = useState(false)

  useEffect(() => {
    if (!ledgers?.length) {
      setSelectedId(null)
      return
    }
    const firstLedger = ledgers[0]
    if (firstLedger && (selectedId == null || !ledgers.some((ledger) => ledger.id === selectedId)))
      setSelectedId(firstLedger.id)
  }, [ledgers, selectedId])
  useEffect(() => {
    if (selectedId != null) localStorage.setItem(SELECTION_KEY, String(selectedId))
  }, [selectedId])

  if (isLoading) return <LoadingState message={t('title')} />
  if (!ledgers?.length) return <Onboarding onCreated={setSelectedId} archived={archived ?? []} />

  const selected = ledgers.find((ledger) => ledger.id === selectedId) ?? ledgers[0]
  if (!selected) return null
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {ledgers.length === 1 && <p className="text-muted-foreground">{selected.title}</p>}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {ledgers.length > 1 && (
            <Select
              value={String(selected.id)}
              onValueChange={(value) => {
                setSelectedId(Number(value))
              }}
            >
              <SelectTrigger
                className="min-w-0 flex-1 sm:w-56 sm:flex-none"
                aria-label={t('switchLedger')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {ledgers.map((ledger) => (
                  <SelectItem key={ledger.id} value={String(ledger.id)}>
                    {ledger.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            className={ledgers.length === 1 ? 'sm:self-end' : undefined}
            onClick={() => {
              setSetupOpen(true)
            }}
          >
            <Plus />
            {t('createAnother')}
          </Button>
        </div>
      </div>
      <LedgerWorkspace ledger={selected} />
      {(archived?.length ?? 0) > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            {t('archived', { count: archived?.length })}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {archived?.map((ledger) => (
              <ArchivedLedger key={ledger.id} ledger={ledger} />
            ))}
          </div>
        </details>
      )}
      <SetupDialog open={setupOpen} onOpenChange={setSetupOpen} onCreated={setSelectedId} />
    </div>
  )
}

function Onboarding({
  onCreated,
  archived = [],
}: {
  onCreated: (id: number) => void
  archived?: Ledger[]
}) {
  const { t } = useTranslation('finance')
  const [open, setOpen] = useState(false)
  return (
    <div className="container mx-auto px-4 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletCards />
          </EmptyMedia>
          <EmptyTitle>{t('onboarding.title')}</EmptyTitle>
          <EmptyDescription>{t('onboarding.description')}</EmptyDescription>
        </EmptyHeader>
        <Button
          onClick={() => {
            setOpen(true)
          }}
        >
          {t('onboarding.start')}
        </Button>
      </Empty>
      <SetupDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
      {archived.length > 0 && (
        <div className="mx-auto mt-8 max-w-2xl space-y-2">
          <h2 className="font-semibold">{t('archived', { count: archived.length })}</h2>
          {archived.map((ledger) => (
            <ArchivedLedger key={ledger.id} ledger={ledger} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchivedLedger({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const restore = useRestoreLedger(ledger.id)
  return (
    <details className="rounded border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          {ledger.title} · {ledger.currency_code}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.preventDefault()
            void restore.mutateAsync()
          }}
        >
          {t('actions.restore')}
        </Button>
      </summary>
      <div className="mt-4 space-y-6">
        <Overview ledger={ledger} />
        <ArchivedTransactions ledger={ledger} />
      </div>
    </details>
  )
}

function ArchivedTransactions({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { data } = useTransactions(ledger.id)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.transactions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <TransactionRows transactions={data?.items ?? []} ledger={ledger} />
      </CardContent>
    </Card>
  )
}

function SetupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (id: number) => void
}) {
  const { t } = useTranslation('finance')
  const { data: currencies } = useCurrencies()
  const create = useCreateLedger()
  const [title, setTitle] = useState(() => t('onboarding.defaultTitle'))
  const [currency, setCurrency] = useState('VND')
  const submit = async () => {
    const ledger = await create.mutateAsync({ title: title.trim(), currency_code: currency })
    onCreated(ledger.id)
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('onboarding.setup')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="finance-title">{t('settings.title')}</Label>
            <Input
              id="finance-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div>
            <Label htmlFor="finance-currency">{t('settings.currency')}</Label>
            <select
              id="finance-currency"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value)
              }}
            >
              {currencies?.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>
          {create.isError && <p className="text-sm text-destructive">{t('errors.save')}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('actions.cancel')}
          </Button>
          <Button disabled={!title.trim() || create.isPending} onClick={() => void submit()}>
            {t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LedgerWorkspace({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  return (
    <Tabs defaultValue="overview" className="min-w-0">
      <div className="mb-4 max-w-full overflow-x-auto border-b scrollbar-none">
        <TabsList variant="line" className="h-10 min-w-max justify-start p-0">
          <TabsTrigger className="flex-none px-3" value="overview">
            {t('areas.overview')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="transactions">
            {t('areas.transactions')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="accounts">
            {t('areas.accounts')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="categories">
            {t('areas.categories')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="pets">
            {t('areas.pets')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="members">
            {t('areas.members')}
          </TabsTrigger>
          <TabsTrigger className="flex-none px-3" value="settings">
            {t('areas.settings')}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview">
        <Overview ledger={ledger} />
      </TabsContent>
      <TabsContent value="transactions">
        <Transactions ledger={ledger} />
      </TabsContent>
      <TabsContent value="accounts">
        <Accounts ledger={ledger} />
      </TabsContent>
      <TabsContent value="categories">
        <Categories ledger={ledger} />
      </TabsContent>
      <TabsContent value="pets">
        <Pets ledger={ledger} />
      </TabsContent>
      <TabsContent value="members">
        <Members ledger={ledger} />
      </TabsContent>
      <TabsContent value="settings">
        <Settings ledger={ledger} />
      </TabsContent>
    </Tabs>
  )
}

const money = (amount: number, ledger: Ledger, locale: string) =>
  formatMoneyMinor(amount, ledger.currency, locale)

function Overview({ ledger }: { ledger: Ledger }) {
  const { t, i18n } = useTranslation('finance')
  const { data, isLoading } = useDashboard(ledger.id)
  if (isLoading || !data) return <LoadingState message={t('areas.overview')} />
  const cards = [
    ['income', data.current_month.income],
    ['expense', data.current_month.expense],
    ['netActivity', data.current_month.net_activity],
  ] as const
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{t(`summary.${label}`)}</CardDescription>
              <CardTitle>{money(value, ledger, i18n.language)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('summary.previousMonth')}: {t('summary.incomeShort')}{' '}
        {money(data.previous_month.income, ledger, i18n.language)} · {t('summary.expenseShort')}{' '}
        {money(data.previous_month.expense, ledger, i18n.language)}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>{t('summary.recent')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionRows transactions={data.recent_transactions} ledger={ledger} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title={t('summary.spendingByCategory')}
          rows={data.spending_by_category}
          ledger={ledger}
        />
        <BreakdownCard
          title={t('summary.spendingByPet')}
          rows={data.spending_by_pet}
          ledger={ledger}
        />
        <BreakdownCard
          title={t('summary.incomeByCategory')}
          rows={data.income_by_category}
          ledger={ledger}
        />
        <Card>
          <CardHeader>
            <CardTitle>{t('summary.sixMonthTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.monthly_trend.map((row) => (
              <div key={row.month} className="flex justify-between gap-3 text-sm">
                <span>{row.month}</span>
                <span className="text-emerald-700">
                  +{money(row.income, ledger, i18n.language)}
                </span>
                <span>−{money(row.expense, ledger, i18n.language)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('summary.byAccount')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.accounts.map((account) => (
              <div key={account.id} className="flex flex-wrap justify-between gap-2 text-sm">
                <span>{account.name}</span>
                <span>
                  {t('summary.incomeShort')} {money(account.income_minor, ledger, i18n.language)} ·{' '}
                  {t('summary.expenseShort')} {money(account.expense_minor, ledger, i18n.language)}{' '}
                  · {t('summary.netActivity')}{' '}
                  {money(account.net_activity_minor, ledger, i18n.language)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BreakdownCard({
  title,
  rows,
  ledger,
}: {
  title: string
  rows: { id: number | null; name: string; total: number }[]
  ledger: Ledger
}) {
  const { i18n, t } = useTranslation('finance')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length ? (
          rows.map((row) => (
            <div className="flex justify-between text-sm" key={`${String(row.id)}-${row.name}`}>
              <span>{row.name}</span>
              <strong>{money(row.total, ledger, i18n.language)}</strong>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t('transactions.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}

function Transactions({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const { data } = useTransactions(ledger.id, filters)
  const { data: accounts } = useAccounts(ledger.id)
  const { data: categories } = useCategories(ledger.id)
  const { data: pets } = useLedgerPets(ledger.id)
  const { data: members } = useMembers(ledger.id)
  const setFilter = (name: string, value: string) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'page' ? {} : { page: '1' }),
    }))
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          placeholder={t('transactions.search')}
          value={filters.search ?? ''}
          onChange={(e) => {
            setFilter('search', e.target.value)
          }}
        />
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={filters.type ?? ''}
          onChange={(e) => {
            setFilter('type', e.target.value)
          }}
        >
          <option value="">{t('transactions.allTypes')}</option>
          <option value="income">{t('types.income')}</option>
          <option value="expense">{t('types.expense')}</option>
        </select>
        <FilterSelect
          label={t('transactions.allAccounts')}
          value={filters.account_id ?? ''}
          onChange={(value) => {
            setFilter('account_id', value)
          }}
          options={(accounts ?? []).map((item) => ({ id: item.id, name: item.name }))}
        />
        <FilterSelect
          label={t('transactions.allCategories')}
          value={filters.category_id ?? ''}
          onChange={(value) => {
            setFilter('category_id', value)
          }}
          options={(categories ?? []).map((item) => ({ id: item.id, name: item.name }))}
        />
        <FilterSelect
          label={t('transactions.allPets')}
          value={filters.pet_id ?? ''}
          onChange={(value) => {
            setFilter('pet_id', value)
          }}
          options={(pets ?? []).map((item) => ({ id: item.id, name: item.name }))}
        />
        <FilterSelect
          label={t('transactions.allCreators')}
          value={filters.creator_id ?? ''}
          onChange={(value) => {
            setFilter('creator_id', value)
          }}
          options={(members ?? []).map((item) => ({ id: item.user_id, name: item.name }))}
        />
        <Input
          className="w-auto"
          aria-label={t('transactions.dateFrom')}
          type="date"
          value={filters.date_from ?? ''}
          onChange={(e) => {
            setFilter('date_from', e.target.value)
          }}
        />
        <Input
          className="w-auto"
          aria-label={t('transactions.dateTo')}
          type="date"
          value={filters.date_to ?? ''}
          onChange={(e) => {
            setFilter('date_to', e.target.value)
          }}
        />
        <Button
          className="ml-auto"
          onClick={() => {
            setOpen(true)
          }}
        >
          <Plus className="mr-2 size-4" />
          {t('transactions.add')}
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <TransactionRows
            transactions={data?.items ?? []}
            ledger={ledger}
            editable
            onEdit={setEditing}
          />
        </CardContent>
      </Card>
      {(data?.last_page ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={(data?.current_page ?? 1) <= 1}
            onClick={() => {
              setFilter('page', String((data?.current_page ?? 1) - 1))
            }}
          >
            {t('actions.previous')}
          </Button>
          <span className="text-sm">
            {data?.current_page} / {data?.last_page}
          </span>
          <Button
            variant="outline"
            disabled={(data?.current_page ?? 1) >= (data?.last_page ?? 1)}
            onClick={() => {
              setFilter('page', String((data?.current_page ?? 1) + 1))
            }}
          >
            {t('actions.next')}
          </Button>
        </div>
      )}
      <TransactionDialog ledger={ledger} open={open} onOpenChange={setOpen} />
      <TransactionDialog
        ledger={ledger}
        transaction={editing}
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value) setEditing(null)
        }}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: number; name: string }[]
}) {
  return (
    <select
      className="h-10 rounded-md border bg-background px-3"
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  )
}

function TransactionRows({
  transactions,
  ledger,
  editable = false,
  onEdit,
}: {
  transactions: LedgerTransaction[]
  ledger: Ledger
  editable?: boolean
  onEdit?: (transaction: LedgerTransaction) => void
}) {
  const { t, i18n } = useTranslation('finance')
  const remove = useDeleteTransaction(ledger.id)
  if (!transactions.length)
    return <p className="py-6 text-center text-muted-foreground">{t('transactions.empty')}</p>
  return (
    <div className="divide-y">
      {transactions.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-3">
          {item.type === 'income' ? (
            <ArrowUpCircle className="size-5 text-emerald-600" />
          ) : (
            <ArrowDownCircle className="size-5 text-rose-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {item.description ?? item.category_name ?? t(`types.${item.type}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.occurred_on} · {item.account_name}
              {item.pets.length ? ` · ${item.pets.map((pet) => pet.name).join(', ')}` : ''}
            </p>
          </div>
          <span
            className={item.type === 'income' ? 'font-semibold text-emerald-700' : 'font-semibold'}
          >
            {item.type === 'income' ? '+' : '−'}
            {money(item.amount_minor, ledger, i18n.language)}
          </span>
          {item.has_receipt && (
            <Button asChild size="icon" variant="ghost">
              <a
                href={receiptUrl(ledger.id, item.id)}
                aria-label={t('transactions.downloadReceipt')}
              >
                <Download className="size-4" />
              </a>
            </Button>
          )}
          {editable && onEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onEdit(item)
              }}
              aria-label={t('actions.edit')}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {editable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm(t('transactions.confirmDelete')))
                  void remove.mutateAsync(item.id)
              }}
            >
              {t('actions.delete')}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

function TransactionDialog({
  ledger,
  transaction,
  open,
  onOpenChange,
}: {
  ledger: Ledger
  transaction?: LedgerTransaction | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t } = useTranslation('finance')
  const { data: accounts } = useAccounts(ledger.id)
  const { data: categories } = useCategories(ledger.id)
  const { data: pets } = useLedgerPets(ledger.id)
  const create = useCreateTransaction(ledger.id)
  const update = useUpdateTransaction(ledger.id)
  const uploadReceipt = useUploadReceipt(ledger.id)
  const deleteReceipt = useDeleteReceipt(ledger.id)
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction?.amount ?? '')
  const [date, setDate] = useState(
    transaction?.occurred_on ?? new Date().toISOString().slice(0, 10)
  )
  const [accountId, setAccountId] = useState<number | null>(transaction?.account_id ?? null)
  const [categoryId, setCategoryId] = useState<number | null>(transaction?.category_id ?? null)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [petIds, setPetIds] = useState<number[]>(
    transaction?.pets.flatMap((pet) => (pet.id == null ? [] : [pet.id])) ?? []
  )
  const [receipt, setReceipt] = useState<File | null>(null)
  const activeAccounts = useMemo(
    () => accounts?.filter((account) => !account.archived_at) ?? [],
    [accounts]
  )
  const matchingCategories = useMemo(
    () =>
      categories?.filter(
        (category) =>
          !category.archived_at && (category.applies_to === type || category.applies_to === 'both')
      ) ?? [],
    [categories, type]
  )
  useEffect(() => {
    if (accountId == null && activeAccounts[0]) setAccountId(activeAccounts[0].id)
  }, [accountId, activeAccounts])
  const submit = async () => {
    if (accountId == null) return
    const body = {
      type,
      amount,
      occurred_on: date,
      account_id: accountId,
      category_id: categoryId,
      description,
      pet_ids: petIds,
    }
    const saved = transaction
      ? await update.mutateAsync({ transactionId: transaction.id, body })
      : await create.mutateAsync(body)
    if (receipt) await uploadReceipt.mutateAsync({ transactionId: saved.id, file: receipt })
    setAmount('')
    setDescription('')
    setPetIds([])
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? t('transactions.edit') : t('transactions.add')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('transactions.type')}>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'income' | 'expense')
                setCategoryId(null)
              }}
            >
              <option value="expense">{t('types.expense')}</option>
              <option value="income">{t('types.income')}</option>
            </select>
          </Field>
          <Field label={`${t('transactions.amount')} (${ledger.currency_code})`}>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
              }}
              placeholder={ledger.currency.minor_units === 0 ? '100000' : '100.00'}
            />
          </Field>
          <Field label={t('transactions.date')}>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
              }}
            />
          </Field>
          <Field label={t('transactions.account')}>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={accountId ?? ''}
              onChange={(e) => {
                setAccountId(Number(e.target.value))
              }}
            >
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('transactions.category')}>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={categoryId ?? ''}
              onChange={(e) => {
                setCategoryId(e.target.value ? Number(e.target.value) : null)
              }}
            >
              <option value="">—</option>
              {matchingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('transactions.pets')}>
            <select
              multiple
              className="min-h-10 w-full rounded-md border bg-background px-3 py-2"
              value={petIds.map(String)}
              onChange={(e) => {
                setPetIds(Array.from(e.target.selectedOptions, (option) => Number(option.value)))
              }}
            >
              {pets?.map((pet) => (
                <option value={pet.id} key={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Label>{t('transactions.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="finance-receipt">{t('transactions.receipt')}</Label>
            <Input
              id="finance-receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                setReceipt(event.target.files?.[0] ?? null)
              }}
            />
            {transaction?.has_receipt && (
              <Button
                className="mt-2"
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void deleteReceipt.mutateAsync(transaction.id)}
              >
                {t('transactions.removeReceipt')}
              </Button>
            )}
          </div>
          {create.isError && (
            <p className="sm:col-span-2 text-sm text-destructive">
              {t('errors.savePrecision', { count: ledger.currency.minor_units })}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            disabled={
              !amount ||
              accountId == null ||
              create.isPending ||
              update.isPending ||
              uploadReceipt.isPending
            }
            onClick={() => void submit()}
          >
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Accounts({ ledger }: { ledger: Ledger }) {
  const { t, i18n } = useTranslation('finance')
  const { data } = useAccounts(ledger.id)
  const create = useCreateAccount(ledger.id)
  const update = useUpdateAccount(ledger.id)
  const archive = useArchiveAccount(ledger.id)
  const [name, setName] = useState('')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.accounts')}</CardTitle>
        <CardDescription>{t('accounts.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            placeholder={t('accounts.name')}
          />
          <Button
            disabled={!name.trim()}
            onClick={() => {
              void create.mutateAsync(name.trim()).then(() => {
                setName('')
              })
            }}
          >
            {t('actions.add')}
          </Button>
        </div>
        <div className="space-y-2">
          {data?.map((account) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
              key={account.id}
            >
              <span className={account.archived_at ? 'text-muted-foreground line-through' : ''}>
                {account.name}
              </span>
              <span className="text-sm">
                {t('summary.incomeShort')} {money(account.income_minor, ledger, i18n.language)} ·{' '}
                {t('summary.expenseShort')} {money(account.expense_minor, ledger, i18n.language)} ·{' '}
                {t('summary.netActivity')}{' '}
                {money(account.net_activity_minor, ledger, i18n.language)}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = window.prompt(t('accounts.name'), account.name)
                    if (next?.trim())
                      void update.mutateAsync({ accountId: account.id, name: next.trim() })
                  }}
                >
                  {t('actions.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void archive.mutateAsync(account.id)}
                >
                  {account.archived_at ? t('actions.restore') : t('actions.archive')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function Categories({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { data } = useCategories(ledger.id)
  const create = useCreateCategory(ledger.id)
  const update = useUpdateCategory(ledger.id)
  const archive = useArchiveCategory(ledger.id)
  const [name, setName] = useState('')
  const [applies, setApplies] = useState('expense')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.categories')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            placeholder={t('categories.name')}
          />
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={applies}
            onChange={(e) => {
              setApplies(e.target.value)
            }}
          >
            <option value="expense">{t('types.expense')}</option>
            <option value="income">{t('types.income')}</option>
            <option value="both">{t('types.both')}</option>
          </select>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              void create.mutateAsync({ name: name.trim(), applies_to: applies }).then(() => {
                setName('')
              })
            }}
          >
            {t('actions.add')}
          </Button>
        </div>
        <div className="space-y-2">
          {data?.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 rounded border p-3 text-sm"
            >
              <span className={category.archived_at ? 'text-muted-foreground line-through' : ''}>
                {category.name}
              </span>
              <div className="flex gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2"
                  value={category.applies_to}
                  disabled={Boolean(category.archived_at)}
                  onChange={(event) => {
                    void update.mutateAsync({
                      categoryId: category.id,
                      body: { name: category.name, applies_to: event.target.value },
                    })
                  }}
                >
                  <option value="expense">{t('types.expense')}</option>
                  <option value="income">{t('types.income')}</option>
                  <option value="both">{t('types.both')}</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = window.prompt(t('categories.name'), category.name)
                    if (next?.trim())
                      void update.mutateAsync({
                        categoryId: category.id,
                        body: { name: next.trim(), applies_to: category.applies_to },
                      })
                  }}
                >
                  {t('actions.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void archive.mutateAsync(category.id)}
                >
                  {category.archived_at ? t('actions.restore') : t('actions.archive')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function Members({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const { user } = useAuth()
  const { data, refetch: refetchMembers } = useMembers(ledger.id)
  const invitation = useCreateLedgerInvitation(ledger.id)
  const { data: invitations } = useLedgerInvitations(ledger.id)
  const revoke = useRevokeLedgerInvitation(ledger.id)
  const remove = useRemoveLedgerMember(ledger.id)
  const addMember = useAddLedgerMember(ledger.id)
  const leave = useLeaveLedger(ledger.id)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [initialInvitation, setInitialInvitation] = useState<SharingInvitation | null>(null)
  const [revokeInvitationId, setRevokeInvitationId] = useState<number | null>(null)
  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t('areas.members')}</CardTitle>
          <CardDescription>{t('members.equal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => {
              setInitialInvitation(null)
              setInviteOpen(true)
            }}
          >
            <Plus />
            {t('members.invite')}
          </Button>
          <ItemGroup className="gap-2">
            {invitations
              ?.filter((item) => item.status === 'pending')
              .map((item) => (
                <Item key={item.id} variant="outline" size="sm" className="flex-nowrap">
                  <ItemContent className="min-w-0">
                    <ItemTitle className="line-clamp-none font-normal">
                      {t('members.pendingUntil', {
                        date: new Date(item.expires_at).toLocaleDateString(),
                      })}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('members.showQr')}
                      onClick={() => {
                        setInitialInvitation({
                          id: item.id,
                          invitationUrl: item.invitation_url,
                          expiresAt: item.expires_at,
                        })
                        setInviteOpen(true)
                      }}
                    >
                      <QrCode />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRevokeInvitationId(item.id)
                      }}
                    >
                      {t('members.revoke')}
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            {data?.map((member) => (
              <Item className="flex-nowrap" variant="outline" size="sm" key={member.user_id}>
                <ItemContent className="min-w-0">
                  <ItemTitle>{member.name}</ItemTitle>
                </ItemContent>
                {member.user_id !== user?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(t('members.confirmRemove')))
                        void remove.mutateAsync(member.user_id)
                    }}
                  >
                    {t('members.remove')}
                  </Button>
                )}
              </Item>
            ))}
          </ItemGroup>
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(t('members.confirmLeave'))) void leave.mutateAsync()
              }}
            >
              {t('members.leave')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResourceSharingDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setInitialInvitation(null)
        }}
        targetName={ledger.title}
        description={t('members.shareDescription', { name: ledger.title })}
        initialInvitation={initialInvitation}
        loadSuggestions={() => listLedgerMemberSuggestions(ledger.id)}
        createInvitation={async () => {
          const result = await invitation.mutateAsync()
          return {
            id: result.invitation.id,
            invitationUrl: result.invitation_url,
            expiresAt: result.invitation.expires_at,
          }
        }}
        addSuggested={async (userId) => addMember.mutateAsync(userId)}
        onChanged={() => {
          void refetchMembers()
        }}
      />

      <RevokeInvitationDialog
        open={revokeInvitationId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeInvitationId(null)
        }}
        pending={revoke.isPending}
        onConfirm={async () => {
          if (revokeInvitationId === null) return
          try {
            await revoke.mutateAsync(revokeInvitationId)
            setRevokeInvitationId(null)
            toast.success('common:messages.invitationRevoked')
          } catch {
            toast.error('common:messages.invitationRevokeFailed')
          }
        }}
      />
    </>
  )
}

function Pets({ ledger }: { ledger: Ledger }) {
  const { t, i18n } = useTranslation('finance')
  const { data: ledgerPets } = useLedgerPets(ledger.id)
  const { data: sections } = useMyPetsSections()
  const add = useAddLedgerPet(ledger.id)
  const remove = useRemoveLedgerPet(ledger.id)
  const candidates = useMemo(() => {
    const seen = new Set<number>()
    return [
      ...(sections?.owned ?? []),
      ...(sections?.fostering_active ?? []),
      ...(sections?.shared ?? []),
    ].filter((pet) => {
      if (seen.has(pet.id) || ledgerPets?.some((current) => current.id === pet.id)) return false
      seen.add(pet.id)
      return true
    })
  }, [ledgerPets, sections])
  const [candidateId, setCandidateId] = useState<number | null>(null)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.pets')}</CardTitle>
        <CardDescription>{t('pets.privacy')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.length > 0 && (
          <div className="flex gap-2">
            <select
              className="h-10 flex-1 rounded-md border bg-background px-3"
              value={candidateId ?? ''}
              onChange={(event) => {
                setCandidateId(Number(event.target.value))
              }}
            >
              <option value="">{t('pets.choose')}</option>
              {candidates.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <Button
              disabled={candidateId == null}
              onClick={() =>
                candidateId != null &&
                void add.mutateAsync(candidateId).then(() => {
                  setCandidateId(null)
                })
              }
            >
              {t('actions.add')}
            </Button>
          </div>
        )}
        {ledgerPets?.map((pet) => (
          <div
            key={pet.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          >
            {pet.can_view_profile ? (
              <Link className="font-medium text-primary underline" to={`/pets/${String(pet.id)}`}>
                {pet.name}
              </Link>
            ) : (
              <span className="font-medium">{pet.name}</span>
            )}
            <span className="text-sm text-muted-foreground">
              {t('summary.incomeShort')} {money(pet.income_minor ?? 0, ledger, i18n.language)} ·{' '}
              {t('summary.expenseShort')} {money(pet.expense_minor ?? 0, ledger, i18n.language)}
            </span>
            <Button size="sm" variant="outline" onClick={() => void remove.mutateAsync(pet.id)}>
              {t('actions.remove')}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Settings({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const archive = useArchiveLedger(ledger.id)
  const destroy = useDeleteLedger(ledger.id)
  const update = useUpdateLedger(ledger.id)
  const link = useLinkLedgerGroup(ledger.id)
  const unlink = useUnlinkLedgerGroup(ledger.id)
  const { data: currencies } = useCurrencies()
  const { data: groups } = useGroups()
  const [title, setTitle] = useState(ledger.title)
  const [currency, setCurrency] = useState(ledger.currency_code)
  const [groupId, setGroupId] = useState<number | null>(ledger.group_id)
  const [importPets, setImportPets] = useState(false)
  const [syncPets, setSyncPets] = useState(ledger.sync_group_pets)
  const linkedGroupId = ledger.group_id
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('areas.settings')}</CardTitle>
        <CardDescription>{t('settings.currencyLocked')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label={t('settings.title')}>
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
        </Field>
        <Field label={t('settings.currency')}>
          <select
            className="h-10 w-full rounded-md border bg-background px-3"
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value)
            }}
          >
            <option value={ledger.currency_code}>
              {ledger.currency_code} — {ledger.currency.name}
            </option>
            {currencies
              ?.filter((item) => item.code !== ledger.currency_code)
              .map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
          </select>
        </Field>
        <Button
          onClick={() => void update.mutateAsync({ title: title.trim(), currency_code: currency })}
        >
          {t('actions.save')}
        </Button>
        {linkedGroupId && (
          <p>
            {t('settings.linkedGroup')}:{' '}
            <Link className="text-primary underline" to={`/groups/${String(linkedGroupId)}`}>
              #{linkedGroupId}
            </Link>
          </p>
        )}
        {!linkedGroupId ? (
          <div className="space-y-3 rounded border p-3">
            <Label>{t('settings.group')}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={groupId ?? ''}
              onChange={(event) => {
                setGroupId(Number(event.target.value))
              }}
            >
              <option value="">{t('settings.chooseGroup')}</option>
              {groups
                ?.filter((group) => group.viewer_role === 'admin')
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
            </select>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={importPets}
                onChange={(event) => {
                  setImportPets(event.target.checked)
                }}
              />
              {t('settings.importPets')}
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncPets}
                onChange={(event) => {
                  setSyncPets(event.target.checked)
                }}
              />
              {t('settings.syncPets')}
            </label>
            <Button
              disabled={groupId == null}
              onClick={() =>
                groupId != null &&
                void link.mutateAsync({
                  group_id: groupId,
                  import_pets: importPets,
                  sync_group_pets: syncPets,
                })
              }
            >
              {t('settings.linkGroup')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded border p-3">
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncPets}
                onChange={(event) => {
                  const next = event.target.checked
                  setSyncPets(next)
                  void link.mutateAsync({
                    group_id: linkedGroupId,
                    import_pets: false,
                    sync_group_pets: next,
                  })
                }}
              />
              {t('settings.syncPets')}
            </label>
            <Button variant="outline" onClick={() => void unlink.mutateAsync()}>
              {t('settings.unlinkGroup')}
            </Button>
          </div>
        )}
        <Button variant="destructive" onClick={() => void archive.mutateAsync()}>
          <Archive className="mr-2 size-4" />
          {t('settings.archive')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            if (window.confirm(t('settings.confirmDelete'))) void destroy.mutateAsync()
          }}
        >
          {t('settings.deleteEmpty')}
        </Button>
      </CardContent>
    </Card>
  )
}
