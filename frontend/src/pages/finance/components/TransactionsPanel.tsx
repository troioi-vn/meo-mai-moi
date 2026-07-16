import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Pencil,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import {
  receiptUrl,
  useAccounts,
  useCategories,
  useCreateTransaction,
  useDeleteReceipt,
  useDeleteTransaction,
  useLedgerPets,
  useMembers,
  useTransactions,
  useUpdateTransaction,
  useUploadReceipt,
  type Ledger,
  type LedgerTransaction,
} from '@/api/finance'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatLedgerMoney } from '../finance-format'
import { FinanceField } from './FinanceField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'

export function TransactionsPanel({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('finance')
  const [editing, setEditing] = useState<LedgerTransaction | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const activeFilterCount = Object.entries(filters).filter(
    ([name, value]) => name !== 'page' && value
  ).length
  const resetFilters = () => {
    setFilters({})
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('transactions.search')}
            value={filters.search ?? ''}
            onChange={(event) => {
              setFilter('search', event.target.value)
            }}
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            'relative',
            (filtersOpen || activeFilterCount > 0) && 'border-primary/40 bg-primary/10 text-primary'
          )}
          aria-label={t('transactions.toggleFilters')}
          aria-expanded={filtersOpen}
          onClick={() => {
            setFiltersOpen((current) => !current)
          }}
        >
          <SlidersHorizontal />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
      {filtersOpen && (
        <div className="overflow-hidden rounded-xl border bg-card/60 shadow-sm backdrop-blur-sm">
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              title={t('transactions.type')}
              label={t('transactions.allTypes')}
              value={filters.type ?? ''}
              onChange={(value) => {
                setFilter('type', value)
              }}
              options={[
                { id: 'income', name: t('types.income') },
                { id: 'expense', name: t('types.expense') },
              ]}
            />
            <FilterSelect
              title={t('transactions.account')}
              label={t('transactions.allAccounts')}
              value={filters.account_id ?? ''}
              onChange={(value) => {
                setFilter('account_id', value)
              }}
              options={(accounts ?? []).map((item) => ({ id: item.id, name: item.name }))}
            />
            <FilterSelect
              title={t('transactions.category')}
              label={t('transactions.allCategories')}
              value={filters.category_id ?? ''}
              onChange={(value) => {
                setFilter('category_id', value)
              }}
              options={(categories ?? []).map((item) => ({ id: item.id, name: item.name }))}
            />
            <FilterSelect
              title={t('transactions.pets')}
              label={t('transactions.allPets')}
              value={filters.pet_id ?? ''}
              onChange={(value) => {
                setFilter('pet_id', value)
              }}
              options={(pets ?? []).map((item) => ({ id: item.id, name: item.name }))}
            />
            <FilterSelect
              title={t('transactions.creator')}
              label={t('transactions.allCreators')}
              value={filters.creator_id ?? ''}
              onChange={(value) => {
                setFilter('creator_id', value)
              }}
              options={(members ?? []).map((item) => ({ id: item.user_id, name: item.name }))}
            />
            <FilterDate
              label={t('transactions.dateFrom')}
              value={filters.date_from ?? ''}
              onChange={(value) => {
                setFilter('date_from', value)
              }}
            />
            <FilterDate
              label={t('transactions.dateTo')}
              value={filters.date_to ?? ''}
              onChange={(value) => {
                setFilter('date_to', value)
              }}
            />
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <Button className="w-full sm:w-auto" variant="ghost" onClick={resetFilters}>
                  <RotateCcw />
                  {t('transactions.resetFilters')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <TransactionRows
        transactions={data?.items ?? []}
        ledger={ledger}
        editable
        onEdit={setEditing}
      />
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
  title,
  label,
  value,
  onChange,
  options,
}: {
  title: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: number | string; name: string }[]
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <Select
        value={value || 'all'}
        onValueChange={(nextValue) => {
          onChange(nextValue === 'all' ? '' : nextValue)
        }}
      >
        <SelectTrigger className="w-full border-0 bg-muted/60 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        className="h-9 border-0 bg-muted/60 text-sm shadow-none"
        type="date"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
    </label>
  )
}

export function TransactionRows({
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
  if (!transactions.length)
    return (
      <div className="rounded-xl border bg-card/60 px-4 py-10 text-center text-muted-foreground">
        {t('transactions.empty')}
      </div>
    )

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card/60 shadow-sm">
      {transactions.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 p-4 sm:items-center"
        >
          <div
            className={cn(
              'mt-0.5 flex size-9 items-center justify-center rounded-full sm:row-span-2',
              item.type === 'income'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-rose-500/10 text-rose-600'
            )}
          >
            {item.type === 'income' ? (
              <ArrowUpCircle className="size-5" />
            ) : (
              <ArrowDownCircle className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {item.description ?? item.category_name ?? t(`types.${item.type}`)}
            </p>
            <p
              className={cn(
                'mt-0.5 text-base font-semibold tabular-nums sm:hidden',
                item.type === 'income' && 'text-emerald-700 dark:text-emerald-400'
              )}
            >
              {item.type === 'income' ? '+' : '−'}
              {formatLedgerMoney(item.amount_minor, ledger, i18n.language)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {item.has_receipt && (
              <Button asChild size="icon-sm" variant="ghost">
                <a
                  href={receiptUrl(ledger.id, item.id)}
                  aria-label={t('transactions.downloadReceipt')}
                >
                  <Download />
                </a>
              </Button>
            )}
            {editable && onEdit && (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  onEdit(item)
                }}
                aria-label={t('actions.edit')}
              >
                <Pencil />
              </Button>
            )}
          </div>
          <div className="col-span-2 col-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:col-span-1">
            <span>{item.occurred_on}</span>
            <span aria-hidden="true">·</span>
            <span>{item.account_name}</span>
            {item.category_name && (
              <>
                <span aria-hidden="true">·</span>
                <span>{item.category_name}</span>
              </>
            )}
            {item.pets.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{item.pets.map((pet) => pet.name).join(', ')}</span>
              </>
            )}
          </div>
          <p
            className={cn(
              'col-start-3 row-start-2 hidden self-start whitespace-nowrap text-sm font-semibold tabular-nums sm:block',
              item.type === 'income' && 'text-emerald-700 dark:text-emerald-400'
            )}
          >
            {item.type === 'income' ? '+' : '−'}
            {formatLedgerMoney(item.amount_minor, ledger, i18n.language)}
          </p>
        </div>
      ))}
    </div>
  )
}

export function TransactionDialog({
  ledger,
  transaction,
  initialType = 'expense',
  open,
  onOpenChange,
}: {
  ledger: Ledger
  transaction?: LedgerTransaction | null
  initialType?: 'income' | 'expense'
  open: boolean
  onOpenChange: (value: boolean) => void
}) {
  const { t } = useTranslation('finance')
  const { data: accounts } = useAccounts(ledger.id)
  const { data: categories } = useCategories(ledger.id)
  const { data: pets } = useLedgerPets(ledger.id)
  const create = useCreateTransaction(ledger.id)
  const update = useUpdateTransaction(ledger.id)
  const uploadReceipt = useUploadReceipt(ledger.id)
  const deleteReceipt = useDeleteReceipt(ledger.id)
  const remove = useDeleteTransaction(ledger.id)
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? initialType)
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
  const [deleteOpen, setDeleteOpen] = useState(false)
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {transaction ? t('transactions.edit') : t('transactions.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FinanceField label={t('transactions.type')}>
              <Select
                value={type}
                onValueChange={(nextValue: 'income' | 'expense') => {
                  setType(nextValue)
                  setCategoryId(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t('types.expense')}</SelectItem>
                  <SelectItem value="income">{t('types.income')}</SelectItem>
                </SelectContent>
              </Select>
            </FinanceField>
            <FinanceField label={`${t('transactions.amount')} (${ledger.currency_code})`}>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                }}
                placeholder={ledger.currency.minor_units === 0 ? '100000' : '100.00'}
              />
            </FinanceField>
            <FinanceField label={t('transactions.date')}>
              <Input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                }}
              />
            </FinanceField>
            <FinanceField label={t('transactions.account')}>
              <Select
                value={accountId == null ? undefined : String(accountId)}
                onValueChange={(nextValue) => {
                  setAccountId(Number(nextValue))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceField>
            <FinanceField label={t('transactions.category')}>
              <Select
                value={categoryId == null ? 'none' : String(categoryId)}
                onValueChange={(nextValue) => {
                  setCategoryId(nextValue === 'none' ? null : Number(nextValue))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {matchingCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FinanceField>
            <FinanceField label={t('transactions.pets')}>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                {pets?.map((pet) => (
                  <Label key={pet.id} className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={petIds.includes(pet.id)}
                      onCheckedChange={(checked) => {
                        setPetIds((current) =>
                          checked
                            ? [...current, pet.id]
                            : current.filter((petId) => petId !== pet.id)
                        )
                      }}
                    />
                    {pet.name}
                  </Label>
                ))}
              </div>
            </FinanceField>
            <div className="sm:col-span-2">
              <Label>{t('transactions.description')}</Label>
              <Textarea
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
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
            {transaction && (
              <Button
                className="mr-auto"
                size="icon"
                variant="destructive"
                aria-label={t('actions.delete')}
                title={t('actions.delete')}
                disabled={remove.isPending}
                onClick={() => {
                  setDeleteOpen(true)
                }}
              >
                <Trash2 />
              </Button>
            )}
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
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('transactions.confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!transaction) return
                void remove.mutateAsync(transaction.id).then(() => {
                  setDeleteOpen(false)
                  onOpenChange(false)
                })
              }}
            >
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
