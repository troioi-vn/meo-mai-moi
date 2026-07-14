import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAccounts, useCategories, useLedgers } from '@/api/finance'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface FinanceExpenseInput {
  ledger_id: number
  account_id: number
  category_id?: number | null
  amount: string
  description?: string | null
}

export function FinanceExpenseFields({
  value,
  onChange,
}: {
  value: FinanceExpenseInput | null
  onChange: (value: FinanceExpenseInput | null) => void
}) {
  const { t } = useTranslation('finance')
  const { data: ledgers } = useLedgers()
  const [enabled, setEnabled] = useState(value !== null)
  const [ledgerId, setLedgerId] = useState<number | null>(value?.ledger_id ?? null)
  const selected = ledgers?.find((ledger) => ledger.id === ledgerId) ?? null
  const { data: accounts } = useAccounts(ledgerId)
  const { data: categories } = useCategories(ledgerId)
  const activeAccounts = useMemo(
    () => accounts?.filter((item) => !item.archived_at) ?? [],
    [accounts]
  )
  const medicalCategories = useMemo(
    () =>
      categories?.filter(
        (item) => !item.archived_at && (item.applies_to === 'expense' || item.applies_to === 'both')
      ) ?? [],
    [categories]
  )

  useEffect(() => {
    if (ledgerId == null && ledgers?.length === 1) setLedgerId(ledgers[0]?.id ?? null)
  }, [ledgerId, ledgers])

  useEffect(() => {
    if (!enabled || ledgerId == null || !activeAccounts[0]) {
      onChange(null)
      return
    }
    const currentAccount = activeAccounts.some((item) => item.id === value?.account_id)
      ? (value?.account_id ?? activeAccounts[0].id)
      : activeAccounts[0].id
    const likelyMedical =
      medicalCategories.find((item) => item.name.toLocaleLowerCase().includes('medical')) ??
      medicalCategories[0]
    onChange({
      ledger_id: ledgerId,
      account_id: currentAccount,
      category_id: value?.ledger_id === ledgerId ? value.category_id : (likelyMedical?.id ?? null),
      amount: value?.ledger_id === ledgerId ? value.amount : '',
      description: value?.ledger_id === ledgerId ? value.description : null,
    })
    // Only initialize when the selectable finance context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccounts, enabled, ledgerId, medicalCategories])

  const update = (patch: Partial<FinanceExpenseInput>) => {
    if (value) onChange({ ...value, ...patch })
  }

  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked)
            if (!event.target.checked) onChange(null)
          }}
        />
        {t('health.addExpense')}
      </label>
      {enabled && (!ledgers || ledgers.length === 0) && (
        <p className="text-sm text-muted-foreground">
          {t('health.noLedgers')}{' '}
          <Link className="text-primary underline" to="/finance">
            {t('onboarding.start')}
          </Link>
        </p>
      )}
      {enabled && (ledgers?.length ?? 0) > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t('health.ledger')}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={ledgerId ?? ''}
              onChange={(event) => {
                setLedgerId(Number(event.target.value))
              }}
            >
              <option value="">{t('health.chooseLedger')}</option>
              {ledgers?.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>
              {t('transactions.amount')} {selected ? `(${selected.currency_code})` : ''}
            </Label>
            <Input
              inputMode="decimal"
              value={value?.amount ?? ''}
              onChange={(event) => {
                update({ amount: event.target.value })
              }}
            />
          </div>
          <div>
            <Label>{t('transactions.account')}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={value?.account_id ?? ''}
              onChange={(event) => {
                update({ account_id: Number(event.target.value) })
              }}
            >
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t('transactions.category')}</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={value?.category_id ?? ''}
              onChange={(event) => {
                update({ category_id: event.target.value ? Number(event.target.value) : null })
              }}
            >
              <option value="">—</option>
              {medicalCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </fieldset>
  )
}
