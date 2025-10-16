import React, { useCallback } from 'react'
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
import type { Pet } from '@/types/pet'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

interface Props {
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onDeletePlacementRequest: (id: number) => void | Promise<void>
}

export const PlacementRequestsSection: React.FC<Props> = ({
  placementRequests,
  canEdit,
  onDeletePlacementRequest,
}) => {
  const handleDelete = useCallback(
    async (requestId: number) => {
      try {
        await onDeletePlacementRequest(requestId)
      } catch (error) {
        console.error('Failed to delete placement request', error)
      }
    },
    [onDeletePlacementRequest]
  )

  if (!placementRequests.length) {
    return <p className="text-muted-foreground">No active placement requests</p>
  }

  return (
    <div className="space-y-2">
      {placementRequests.map((request) => (
        <div
          key={request.id}
          className="flex justify-between items-center p-3 bg-background rounded border"
        >
          <div>
            <span className="font-medium">
              {request.request_type.replace('_', ' ').toUpperCase()}
            </span>
            {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
          </div>
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Placement Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this placement request? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDelete(request.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  )
}
