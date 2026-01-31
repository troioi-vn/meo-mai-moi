import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'

type Status = 'active' | 'lost' | 'deceased' | 'deleted' | ''

interface Props {
  currentStatus: Exclude<Status, ''>
  newStatus: Exclude<Status, 'deleted' | ''>
  setNewStatus: (s: Exclude<Status, 'deleted' | ''>) => void
  onUpdateStatus: () => void
  isUpdating: boolean
}

export const PetStatusControls: React.FC<Props> = ({
  currentStatus,
  newStatus,
  setNewStatus,
  onUpdateStatus,
  isUpdating,
}) => {
  const { t } = useTranslation(['pets', 'common'])
  const statusChanged = currentStatus !== newStatus

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pets:statusControls.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('pets:statusControls.current')}
          <span className="font-medium">{t(`pets:statusLabels.${currentStatus}`)}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
          <div className="text-sm font-medium">{t('pets:statusControls.newLabel')}</div>
          <div>
            <Select
              value={newStatus}
              onValueChange={(v) => {
                setNewStatus(v as typeof newStatus)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('pets:statusControls.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('pets:statusLabels.active')}</SelectItem>
                <SelectItem value="lost">{t('pets:statusLabels.lost')}</SelectItem>
                <SelectItem value="deceased">{t('pets:statusLabels.deceased')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isUpdating || !statusChanged}>
                {isUpdating
                  ? t('pets:statusControls.updating')
                  : t('pets:statusControls.updateButton')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('pets:statusControls.dialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('pets:statusControls.dialogDescription', {
                    current: t(`pets:statusLabels.${currentStatus}`),
                    new: t(`pets:statusLabels.${newStatus}`),
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={onUpdateStatus}>
                  {t('pets:statusControls.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
