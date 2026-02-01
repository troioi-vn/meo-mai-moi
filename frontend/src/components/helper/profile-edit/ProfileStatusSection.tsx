import { Trash2, UserCog } from 'lucide-react'
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
import { FormSectionHeader } from './FormSectionHeader'
import { useTranslation } from 'react-i18next'

export function ProfileStatusSection({
  status,
  hasPlacementResponses,
  onArchive,
  onRestore,
  onDelete,
  isArchiving,
  isRestoring,
  isDeleting,
}: {
  status?: string
  hasPlacementResponses: boolean
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  isArchiving: boolean
  isRestoring: boolean
  isDeleting: boolean
}) {
  const { t } = useTranslation('common')

  return (
    <section className="pt-6 border-t space-y-4">
      <FormSectionHeader icon={UserCog} title={t('common:helperProfiles.status.title')} />
      <div className="flex flex-wrap gap-4">
        {status === 'active' && (
          <Button type="button" variant="outline" onClick={onArchive} disabled={isArchiving}>
            {isArchiving
              ? t('common:helperProfiles.status.archiving')
              : t('common:helperProfiles.status.archiveProfile')}
          </Button>
        )}
        {status === 'archived' && (
          <Button type="button" variant="outline" onClick={onRestore} disabled={isRestoring}>
            {isRestoring
              ? t('common:helperProfiles.status.restoring')
              : t('common:helperProfiles.status.restoreProfile')}
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting
                ? t('common:helperProfiles.status.deleting')
                : t('common:helperProfiles.status.deleteProfile')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('common:helperProfiles.status.confirmDeleteTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('common:helperProfiles.status.confirmDeleteDescription')}
                {hasPlacementResponses && (
                  <p className="mt-2 font-semibold text-destructive">
                    {t('common:helperProfiles.status.cannotDeleteWithRequests')}
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common:actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  )
}
