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
  return (
    <section className="pt-6 border-t space-y-4">
      <FormSectionHeader icon={UserCog} title="Profile Status" />
      <div className="flex flex-wrap gap-4">
        {status === 'active' && (
          <Button type="button" variant="outline" onClick={onArchive} disabled={isArchiving}>
            {isArchiving ? 'Archiving...' : 'Archive Profile'}
          </Button>
        )}
        {status === 'archived' && (
          <Button type="button" variant="outline" onClick={onRestore} disabled={isRestoring}>
            {isRestoring ? 'Restoring...' : 'Restore Profile'}
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Profile'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your helper profile and
                remove your data from our servers.
                {hasPlacementResponses && (
                  <p className="mt-2 font-semibold text-destructive">
                    Note: Profiles with associated placement requests cannot be deleted.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  )
}
