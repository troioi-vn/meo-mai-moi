import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAccounts,
  useArchiveAccount,
  useCreateAccount,
  useUpdateAccount,
  type Ledger,
} from '@/api/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatLedgerMoney } from '../finance-format'

export function AccountsPanel({ ledger }: { ledger: Ledger }) {
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
            onChange={(event) => {
              setName(event.target.value)
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
                {t('summary.incomeShort')}{' '}
                {formatLedgerMoney(account.income_minor, ledger, i18n.language)} ·{' '}
                {t('summary.expenseShort')}{' '}
                {formatLedgerMoney(account.expense_minor, ledger, i18n.language)} ·{' '}
                {t('summary.netActivity')}{' '}
                {formatLedgerMoney(account.net_activity_minor, ledger, i18n.language)}
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
