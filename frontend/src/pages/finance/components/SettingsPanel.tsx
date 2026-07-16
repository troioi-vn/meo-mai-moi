import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Archive, Plus } from 'lucide-react'
import {
  useArchiveLedger,
  useCurrencies,
  useDeleteLedger,
  useLinkLedgerGroup,
  useUnlinkLedgerGroup,
  useUpdateLedger,
  type Ledger,
} from '@/api/finance'
import { useGroups } from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FinanceField } from './FinanceField'
import { LedgerSetupDialog } from './LedgerSetupDialog'

export function SettingsPanel({
  ledger,
  onLedgerCreated,
}: {
  ledger: Ledger
  onLedgerCreated: (id: number) => void
}) {
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
  const [createOpen, setCreateOpen] = useState(false)
  const linkedGroupId = ledger.group_id

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('areas.settings')}</CardTitle>
          <CardDescription>{t('settings.currencyLocked')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FinanceField label={t('settings.title')}>
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
              }}
            />
          </FinanceField>
          <FinanceField label={t('settings.currency')}>
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
          </FinanceField>
          <Button
            onClick={() =>
              void update.mutateAsync({ title: title.trim(), currency_code: currency })
            }
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
            <Archive />
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
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.global')}</CardTitle>
          <CardDescription>{t('settings.globalDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setCreateOpen(true)
            }}
          >
            <Plus />
            {t('settings.createLedger')}
          </Button>
        </CardContent>
      </Card>
      <LedgerSetupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onLedgerCreated}
      />
    </div>
  )
}
