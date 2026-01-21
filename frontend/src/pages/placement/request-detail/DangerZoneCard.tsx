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
  if (!canDelete) return null

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
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
              Delete Placement Request
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Placement Request</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this placement request? This action cannot be undone
                and will reject all pending responses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void onDelete()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
