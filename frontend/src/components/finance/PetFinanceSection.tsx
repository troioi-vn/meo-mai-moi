import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatMoneyMinor,
  useAccounts,
  useAddLedgerPet,
  useCategories,
  useCreateTransaction,
  useLedgerPets,
  useLedgers,
  usePetFinanceTransactions,
} from '@/api/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function PetFinanceSection({ petId }: { petId: number }) {
  const { t, i18n } = useTranslation('finance')
  const { data: page } = usePetFinanceTransactions(petId)
  const { data: ledgers } = useLedgers()
  const [adding, setAdding] = useState(false)
  const [ledgerId, setLedgerId] = useState<number | null>(null)
  const selected = ledgers?.find((ledger) => ledger.id === ledgerId) ?? null
  const { data: accounts } = useAccounts(ledgerId)
  const { data: categories } = useCategories(ledgerId)
  const { data: ledgerPets } = useLedgerPets(ledgerId)
  const create = useCreateTransaction(ledgerId ?? 0)
  const addPet = useAddLedgerPet(ledgerId ?? 0)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)

  const save = async () => {
    if (!selected || accountId == null || !amount) return
    if (!ledgerPets?.some((pet) => pet.id === petId)) await addPet.mutateAsync(petId)
    await create.mutateAsync({
      type: 'expense',
      amount,
      occurred_on: new Date().toISOString().slice(0, 10),
      account_id: accountId,
      category_id: categoryId,
      pet_ids: [petId],
    })
    setAmount('')
    setAdding(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t('petProfile.title')}</CardTitle>
        {(ledgers?.length ?? 0) > 0 && (
          <Button
            size="sm"
            onClick={() => {
              setAdding((value) => !value)
            }}
          >
            {t('petProfile.addExpense')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="grid gap-3 rounded border p-3 sm:grid-cols-2">
            <div>
              <Label>{t('health.ledger')}</Label>
              <Select
                value={ledgerId == null ? undefined : String(ledgerId)}
                onValueChange={(value) => {
                  const next = Number(value)
                  setLedgerId(next)
                  setAccountId(null)
                  setCategoryId(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('health.chooseLedger')} />
                </SelectTrigger>
                <SelectContent>
                  {ledgers?.map((ledger) => (
                    <SelectItem key={ledger.id} value={String(ledger.id)}>
                      {ledger.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('transactions.amount')}</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                }}
              />
            </div>
            <div>
              <Label>{t('transactions.account')}</Label>
              <Select
                value={accountId == null ? 'none' : String(accountId)}
                onValueChange={(value) => {
                  setAccountId(value === 'none' ? null : Number(value))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {accounts
                    ?.filter((item) => !item.archived_at)
                    .map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('transactions.category')}</Label>
              <Select
                value={categoryId == null ? 'none' : String(categoryId)}
                onValueChange={(value) => {
                  setCategoryId(value === 'none' ? null : Number(value))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories
                    ?.filter((item) => !item.archived_at && item.applies_to !== 'income')
                    .map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!selected || accountId == null || !amount}
              onClick={() => void save()}
            >
              {t('actions.save')}
            </Button>
          </div>
        )}
        {!page?.items.length && (
          <p className="text-sm text-muted-foreground">{t('transactions.empty')}</p>
        )}
        {page?.items.map((transaction) => {
          const ledger = ledgers?.find((item) => item.id === transaction.ledger_id)
          return (
            <div key={transaction.id} className="flex justify-between gap-3 border-t pt-3 text-sm">
              <span>
                {transaction.occurred_on} ·{' '}
                {transaction.description ?? transaction.category_name ?? t('types.expense')}
              </span>
              <strong>
                {ledger
                  ? formatMoneyMinor(transaction.amount_minor, ledger.currency, i18n.language)
                  : transaction.amount}
              </strong>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
