import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Trash2, Users, Clock } from 'lucide-react'
import type { Pet } from '@/types/pet'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

interface Props {
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onDeletePlacementRequest: (id: number) => void | Promise<void>
}

const formatRequestType = (type: string): string => {
  const labels: Record<string, string> = {
    foster_free: 'Foster (Free)',
    foster_payed: 'Foster (Paid)',
    permanent: 'Permanent Adoption',
  }
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const getRequestTypeBadgeVariant = (
  type: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (type === 'permanent') return 'default'
  if (type.includes('foster')) return 'secondary'
  return 'outline'
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
    return null
  }

  return (
    <div className="space-y-3">
      {placementRequests.map((request) => {
        const pendingResponses =
          request.transfer_requests?.filter((tr) => tr.status === 'pending') ?? []
        const responseCount = pendingResponses.length

        return (
          <div key={request.id} className="rounded-lg border p-4 bg-muted/50 space-y-3">
            {/* Header: Request type and actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <Badge variant={getRequestTypeBadgeVariant(request.request_type)} className="w-fit">
                  {formatRequestType(request.request_type)}
                </Badge>
                {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
              </div>

              {canEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Placement Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this placement request? This action cannot
                        be undone.
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

            {/* Footer: Response count and dates */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {responseCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                  </span>
                </div>
              )}
              {request.expires_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Expires {new Date(request.expires_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
