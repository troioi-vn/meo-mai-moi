import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownCircle, ArrowUpCircle, Download, Pencil, Plus } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
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
import { formatLedgerMoney } from '../finance-format'
import { FinanceField } from './FinanceField'

export function TransactionsPanel({ ledger }: { ledger: Ledger }) {
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
          onChange={(event) => {
            setFilter('search', event.target.value)
          }}
        />
        <select
          className="h-10 rounded-md border bg-background px-3"
          value={filters.type ?? ''}
          onChange={(event) => {
            setFilter('type', event.target.value)
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
          onChange={(event) => {
            setFilter('date_from', event.target.value)
          }}
        />
        <Input
          className="w-auto"
          aria-label={t('transactions.dateTo')}
          type="date"
          value={filters.date_to ?? ''}
          onChange={(event) => {
            setFilter('date_to', event.target.value)
          }}
        />
        <Button
          className="ml-auto"
          onClick={() => {
            setOpen(true)
          }}
        >
          <Plus />
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
            {formatLedgerMoney(item.amount_minor, ledger, i18n.language)}
          </span>
          {item.has_receipt && (
            <Button asChild size="icon" variant="ghost">
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
              size="icon"
              variant="ghost"
              onClick={() => {
                onEdit(item)
              }}
              aria-label={t('actions.edit')}
            >
              <Pencil />
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
          <FinanceField label={t('transactions.type')}>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={type}
              onChange={(event) => {
                setType(event.target.value as 'income' | 'expense')
                setCategoryId(null)
              }}
            >
              <option value="expense">{t('types.expense')}</option>
              <option value="income">{t('types.income')}</option>
            </select>
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
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={accountId ?? ''}
              onChange={(event) => {
                setAccountId(Number(event.target.value))
              }}
            >
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </FinanceField>
          <FinanceField label={t('transactions.category')}>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={categoryId ?? ''}
              onChange={(event) => {
                setCategoryId(event.target.value ? Number(event.target.value) : null)
              }}
            >
              <option value="">—</option>
              {matchingCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </FinanceField>
          <FinanceField label={t('transactions.pets')}>
            <select
              multiple
              className="min-h-10 w-full rounded-md border bg-background px-3 py-2"
              value={petIds.map(String)}
              onChange={(event) => {
                setPetIds(
                  Array.from(event.target.selectedOptions, (option) => Number(option.value))
                )
              }}
            >
              {pets?.map((pet) => (
                <option value={pet.id} key={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
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
