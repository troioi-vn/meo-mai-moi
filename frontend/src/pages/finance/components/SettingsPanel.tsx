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
import { Checkbox } from '@/components/ui/checkbox'
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
  const [deleteOpen, setDeleteOpen] = useState(false)
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
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ledger.currency_code}>
                  {ledger.currency_code} — {ledger.currency.name}
                </SelectItem>
                {currencies
                  ?.filter((item) => item.code !== ledger.currency_code)
                  .map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
              <Select
                value={groupId == null ? undefined : String(groupId)}
                onValueChange={(value) => {
                  setGroupId(Number(value))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.chooseGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {groups
                    ?.filter((group) => group.viewer_role === 'admin')
                    .map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={importPets}
                  onCheckedChange={(checked) => {
                    setImportPets(Boolean(checked))
                  }}
                />
                {t('settings.importPets')}
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={syncPets}
                  onCheckedChange={(checked) => {
                    setSyncPets(Boolean(checked))
                  }}
                />
                {t('settings.syncPets')}
              </Label>
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
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={syncPets}
                  onCheckedChange={(checked) => {
                    const next = Boolean(checked)
                    setSyncPets(next)
                    void link.mutateAsync({
                      group_id: linkedGroupId,
                      import_pets: false,
                      sync_group_pets: next,
                    })
                  }}
                />
                {t('settings.syncPets')}
              </Label>
              <Button variant="outline" onClick={() => void unlink.mutateAsync()}>
                {t('settings.unlinkGroup')}
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => void archive.mutateAsync()}>
            <Archive />
            {t('settings.archive')}
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
      {ledger.can_delete && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('settings.dangerZone')}</CardTitle>
            <CardDescription>{t('settings.dangerDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => {
                destroy.reset()
                setDeleteOpen(true)
              }}
            >
              {t('settings.deleteUnused')}
            </Button>
          </CardContent>
        </Card>
      )}
      <LedgerSetupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={onLedgerCreated}
      />
      {ledger.can_delete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.deleteUnused')}</AlertDialogTitle>
              <AlertDialogDescription>{t('settings.confirmDelete')}</AlertDialogDescription>
            </AlertDialogHeader>
            {destroy.isError && (
              <p className="text-sm text-destructive">{t('settings.deleteFailed')}</p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={destroy.isPending}
                onClick={() => {
                  destroy.mutate(undefined, {
                    onSuccess: () => {
                      setDeleteOpen(false)
                    },
                  })
                }}
              >
                {t('settings.deleteUnused')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
