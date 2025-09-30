import React from 'react'
import { Input } from '@/components/ui/input'
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

interface Props {
  deletePassword: string
  setDeletePassword: (s: string) => void
  isDeleting: boolean
  onDelete: () => void
}

export const PetDangerZone: React.FC<Props> = ({
  deletePassword,
  setDeletePassword,
  isDeleting,
  onDelete,
}) => {
  return (
    <div className="border-t pt-6">
      <h2 className="text-xl font-semibold text-destructive">Danger zone</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Removing this pet is irreversible. All associated data will be deleted.
      </p>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
        <div className="text-sm font-medium">Password</div>
        <div>
          <Input
            type="password"
            placeholder="Confirm with your password"
            value={deletePassword}
            onChange={(e) => {
              setDeletePassword(e.target.value)
            }}
          />
        </div>
      </div>
      <div className="mt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Remove pet'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove pet?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. Type your password and click confirm to proceed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDelete() }}>
                Confirm remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
