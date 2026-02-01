import { useTranslation } from 'react-i18next'
import { Loader2, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DangerZoneCardProps {
  canDelete: boolean
  actionLoading: string | null
  onDelete: () => Promise<void>
}

export function DangerZoneCard({ canDelete, actionLoading, onDelete }: DangerZoneCardProps) {
  const { t } = useTranslation('common')

  if (!canDelete) return null

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-destructive">{t('requestDetail.dangerZone')}</CardTitle>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={actionLoading === 'delete'}>
              {actionLoading === 'delete' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('requestDetail.deletePlacementRequest')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('requestDetail.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('requestDetail.deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void onDelete()}
              >
                {t('actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
