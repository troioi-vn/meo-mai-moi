import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateLedger, useCurrencies } from '@/api/finance'
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

export function LedgerSetupDialog({
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
