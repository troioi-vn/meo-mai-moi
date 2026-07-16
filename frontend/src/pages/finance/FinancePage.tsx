import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BanknoteArrowDown, BanknoteArrowUp, ChevronDown, WalletCards } from 'lucide-react'
import { useLedgers, useRestoreLedger, useTransactions, type Ledger } from '@/api/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { LoadingState } from '@/components/ui/LoadingState'
import { FinanceWorkspace } from './components/FinanceWorkspace'
import { LedgerSetupDialog } from './components/LedgerSetupDialog'
import { OverviewPanel } from './components/OverviewPanel'
import { TransactionDialog, TransactionRows } from './components/TransactionsPanel'
import { financePath, isFinanceArea } from './finance-route'
import { PageContainer } from '@/components/layout/PageLayout'

export default function FinancePage() {
  const { t } = useTranslation('finance')
  const navigate = useNavigate()
  const { ledgerId: ledgerIdParam, area: areaParam } = useParams<{
    ledgerId?: string
    area?: string
  }>()
  const { data: ledgers, isLoading } = useLedgers()
  const { data: archived } = useLedgers(true)
  const [quickTransactionType, setQuickTransactionType] = useState<'income' | 'expense' | null>(
    null
  )

  if (isLoading) return <LoadingState message={t('title')} />
  if (!ledgers?.length) {
    return (
      <Onboarding
        onCreated={(id) => {
          void navigate(financePath(id))
        }}
        archived={archived ?? []}
      />
    )
  }

  const ledgerId = Number(ledgerIdParam)
  const selected =
    Number.isInteger(ledgerId) && String(ledgerId) === ledgerIdParam
      ? ledgers.find((ledger) => ledger.id === ledgerId)
      : undefined
  if (!selected || !isFinanceArea(areaParam)) {
    const fallback = selected ?? ledgers[0]
    return fallback ? <Navigate to={financePath(fallback.id)} replace /> : null
  }

  return (
    <PageContainer width="wide" className="py-6 sm:py-8">
      <div className="mb-6 flex min-w-0 items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold">
          {ledgers.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={t('switchLedger')}
              >
                <span className="truncate">{selected.title}</span>
                <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ledgers.map((ledger) => (
                  <DropdownMenuItem
                    key={ledger.id}
                    className={ledger.id === selected.id ? 'bg-accent font-medium' : undefined}
                    onClick={() => {
                      void navigate(financePath(ledger.id, areaParam))
                    }}
                  >
                    {ledger.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="block truncate">{selected.title}</span>
          )}
        </h1>
        <Button
          size="icon"
          variant="outline"
          className="text-emerald-700"
          aria-label={t('transactions.addIncome')}
          title={t('transactions.addIncome')}
          onClick={() => {
            setQuickTransactionType('income')
          }}
        >
          <BanknoteArrowUp />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="text-rose-700"
          aria-label={t('transactions.addExpense')}
          title={t('transactions.addExpense')}
          onClick={() => {
            setQuickTransactionType('expense')
          }}
        >
          <BanknoteArrowDown />
        </Button>
      </div>
      <FinanceWorkspace
        key={selected.id}
        ledger={selected}
        area={areaParam}
        onAreaChange={(area) => {
          void navigate(financePath(selected.id, area))
        }}
        onLedgerCreated={(id) => {
          void navigate(financePath(id))
        }}
      />
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
      {quickTransactionType && (
        <TransactionDialog
          ledger={selected}
          initialType={quickTransactionType}
          open
          onOpenChange={(open) => {
            if (!open) setQuickTransactionType(null)
          }}
        />
      )}
    </PageContainer>
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
      <LedgerSetupDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
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
        <OverviewPanel ledger={ledger} />
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
