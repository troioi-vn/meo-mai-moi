import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, WalletCards } from 'lucide-react'
import {
  useCreateLedger,
  useCurrencies,
  useLedgers,
  useRestoreLedger,
  useTransactions,
  type Ledger,
} from '@/api/finance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/LoadingState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FinanceWorkspace } from './components/FinanceWorkspace'
import { OverviewPanel } from './components/OverviewPanel'
import { TransactionRows } from './components/TransactionsPanel'
import { financePath, isFinanceArea } from './finance-route'

export default function FinancePage() {
  const { t } = useTranslation('finance')
  const navigate = useNavigate()
  const { ledgerId: ledgerIdParam, area: areaParam } = useParams<{
    ledgerId?: string
    area?: string
  }>()
  const { data: ledgers, isLoading } = useLedgers()
  const { data: archived } = useLedgers(true)
  const [setupOpen, setSetupOpen] = useState(false)

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
                void navigate(financePath(Number(value), areaParam))
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
      <FinanceWorkspace
        key={selected.id}
        ledger={selected}
        area={areaParam}
        onAreaChange={(area) => {
          void navigate(financePath(selected.id, area))
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
      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onCreated={(id) => {
          void navigate(financePath(id))
        }}
      />
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

function SetupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
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
              onChange={(event) => {
                setTitle(event.target.value)
              }}
            />
          </div>
          <div>
            <Label htmlFor="finance-currency">{t('settings.currency')}</Label>
            <select
              id="finance-currency"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value)
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
