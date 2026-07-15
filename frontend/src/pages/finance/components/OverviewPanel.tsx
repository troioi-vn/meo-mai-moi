import { useTranslation } from 'react-i18next'
import { useDashboard, type Ledger } from '@/api/finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { TransactionRows } from './TransactionsPanel'
import { formatLedgerMoney } from '../finance-format'

export function OverviewPanel({ ledger }: { ledger: Ledger }) {
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
              <CardTitle>{formatLedgerMoney(value, ledger, i18n.language)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('summary.previousMonth')}: {t('summary.incomeShort')}{' '}
        {formatLedgerMoney(data.previous_month.income, ledger, i18n.language)} ·{' '}
        {t('summary.expenseShort')}{' '}
        {formatLedgerMoney(data.previous_month.expense, ledger, i18n.language)}
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
                  +{formatLedgerMoney(row.income, ledger, i18n.language)}
                </span>
                <span>−{formatLedgerMoney(row.expense, ledger, i18n.language)}</span>
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
                  {t('summary.incomeShort')}{' '}
                  {formatLedgerMoney(account.income_minor, ledger, i18n.language)} ·{' '}
                  {t('summary.expenseShort')}{' '}
                  {formatLedgerMoney(account.expense_minor, ledger, i18n.language)} ·{' '}
                  {t('summary.netActivity')}{' '}
                  {formatLedgerMoney(account.net_activity_minor, ledger, i18n.language)}
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
              <strong>{formatLedgerMoney(row.total, ledger, i18n.language)}</strong>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{t('transactions.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
