import React, { useCallback, useState } from 'react'
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
import { Trash2, Users, Clock, CheckCircle2, Loader2, Home } from 'lucide-react'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import type { Pet, TransferRequest } from '@/types/pet'
import { ResponsesDrawer } from './ResponsesDrawer'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

interface Props {
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onDeletePlacementRequest: (id: number) => void | Promise<void>
  onRefresh?: () => void
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

const getStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
  switch (status) {
    case 'open':
      return 'default'
    case 'fulfilled':
      return 'secondary'
    case 'pending_transfer':
      return 'secondary'
    case 'active':
      return 'success'
    case 'finalized':
      return 'success'
    default:
      return 'outline'
  }
}

const formatStatus = (status: string): string => {
  const labels: Record<string, string> = {
    open: 'Open',
    fulfilled: 'Awaiting Helper Confirmation',
    pending_transfer: 'Transfer in Progress',
    active: 'Active Fostering',
    finalized: 'Completed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }
  return labels[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const isFosteringType = (type: string): boolean => {
  return type === 'foster_free' || type === 'foster_payed'
}

export const PlacementRequestsSection: React.FC<Props> = ({
  placementRequests,
  canEdit,
  onDeletePlacementRequest,
  onRefresh,
}) => {
  const [finalizingId, setFinalizingId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)

  // Get the pending responses for the active request
  const activeRequest = placementRequests.find((r) => r.id === activeRequestId)
  const activeResponses: TransferRequest[] =
    activeRequest?.transfer_requests?.filter((tr) => tr.status === 'pending') ?? []

  const handleOpenResponses = (requestId: number) => {
    setActiveRequestId(requestId)
    setDrawerOpen(true)
  }

  const handleConfirmResponse = useCallback(
    async (transferId: number) => {
      try {
        await api.post(`transfer-requests/${String(transferId)}/confirm`)
        toast.success('Response accepted!')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to confirm transfer request', error)
        toast.error('Failed to accept response. Please try again.')
      }
    },
    [onRefresh]
  )

  const handleRejectResponse = useCallback(
    async (transferId: number) => {
      try {
        await api.post(`transfer-requests/${String(transferId)}/reject`)
        toast.success('Response rejected')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to reject transfer request', error)
        toast.error('Failed to reject response. Please try again.')
      }
    },
    [onRefresh]
  )

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

  const handleFinalize = useCallback(
    async (requestId: number) => {
      setFinalizingId(requestId)
      try {
        await api.post(`placement-requests/${String(requestId)}/finalize`)
        toast.success('Pet has been marked as returned!')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to finalize placement request', error)
        toast.error('Failed to mark pet as returned. Please try again.')
      } finally {
        setFinalizingId(null)
      }
    },
    [onRefresh]
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
        const isActive = request.status === 'active'
        const isFostering = isFosteringType(request.request_type)
        const showReturnButton = canEdit && isActive && isFostering
        const isFinishing = finalizingId === request.id

        return (
          <div key={request.id} className="rounded-lg border p-4 bg-muted/50 space-y-3">
            {/* Header: Request type, status, and actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={getRequestTypeBadgeVariant(request.request_type)}
                    className="w-fit"
                  >
                    {formatRequestType(request.request_type)}
                  </Badge>
                  {request.status !== 'open' && (
                    <Badge variant={getStatusBadgeVariant(request.status)} className="w-fit">
                      {formatStatus(request.status)}
                    </Badge>
                  )}
                </div>
                {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}
              </div>

              {canEdit && request.status === 'open' && (
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

            {/* Active fostering status indicator */}
            {isActive && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <Home className="h-4 w-4" />
                  <span>Pet is currently with foster</span>
                </div>
              </div>
            )}

            {/* Pet is returned button for active fostering */}
            {showReturnButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={isFinishing}>
                    {isFinishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Pet is Returned
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Pet Return</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you confirming that the pet has been returned to you? This will end the
                      fostering period and mark the placement as completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleFinalize(request.id)}
                      disabled={isFinishing}
                    >
                      {isFinishing ? 'Processing...' : 'Confirm Return'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Finalized status */}
            {request.status === 'finalized' && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Placement completed successfully</span>
                </div>
              </div>
            )}

            {/* Footer: Response count and dates (only for open requests) */}
            {request.status === 'open' && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {responseCount > 0 && canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenResponses(request.id)
                    }}
                    className="flex items-center gap-1 hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    <span>
                      {responseCount} {responseCount === 1 ? 'response' : 'responses'}
                    </span>
                  </button>
                )}
                {responseCount > 0 && !canEdit && (
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
            )}
          </div>
        )
      })}

      {/* Responses Drawer */}
      {activeRequest && (
        <ResponsesDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          responses={activeResponses}
          requestType={activeRequest.request_type}
          onConfirm={handleConfirmResponse}
          onReject={handleRejectResponse}
        />
      )}
    </div>
  )
}
