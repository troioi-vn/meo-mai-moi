import React, { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
import {
  Trash2,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Home,
  MessageCircle,
  X,
  ExternalLink,
} from 'lucide-react'
import { toast } from '@/lib/i18n-toast'
import type { Pet } from '@/types/pet'
import type { PlacementRequestResponse } from '@/types/placement'
import {
  formatRequestType,
  formatStatus,
  isFosteringType,
  isTemporaryType,
} from '@/types/placement'
import { ResponsesDrawer } from './ResponsesDrawer'
import {
  postPlacementResponsesIdAccept as acceptPlacementResponse,
  postPlacementResponsesIdReject as rejectPlacementResponse,
} from '@/api/generated/placement-request-responses/placement-request-responses'
import { deleteTransferRequestsId as rejectTransfer } from '@/api/generated/transfer-requests/transfer-requests'
import { postPlacementRequestsIdFinalize as finalizePlacementRequest } from '@/api/generated/placement-requests/placement-requests'
import { useCreateChat } from '@/hooks/useMessaging'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

interface Props {
  placementRequests: PlacementRequest[]
  canEdit: boolean
  onDeletePlacementRequest: (id: number) => void | Promise<void>
  onRefresh?: () => void
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
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'open':
      return 'default'
    case 'pending_transfer':
      return 'secondary'
    case 'active':
      return 'outline'
    case 'finalized':
      return 'outline'
    default:
      return 'outline'
  }
}

export const PlacementRequestsSection: React.FC<Props> = ({
  placementRequests,
  canEdit,
  onDeletePlacementRequest,
  onRefresh,
}) => {
  const navigate = useNavigate()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const [finalizingId, setFinalizingId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)
  const [cancellingTransferId, setCancellingTransferId] = useState<number | null>(null)

  // Get the pending responses for the active request (status='responded')
  const activeRequest = placementRequests.find((r) => r.id === activeRequestId)
  const activeResponses: PlacementRequestResponse[] =
    activeRequest?.responses?.filter((r) => r.status === 'responded') ?? []

  // Get accepted response for pending_transfer state
  const getAcceptedResponse = (request: PlacementRequest): PlacementRequestResponse | undefined => {
    return request.responses?.find((r) => r.status === 'accepted')
  }

  const handleOpenResponses = (requestId: number) => {
    setActiveRequestId(requestId)
    setDrawerOpen(true)
  }

  const handleAcceptResponse = useCallback(
    async (responseId: number) => {
      try {
        await acceptPlacementResponse(responseId)
        toast.success('pets:placement.messages.responseAccepted')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to accept response', error)
        toast.error('pets:placement.messages.acceptFailed')
      }
    },
    [onRefresh]
  )

  const handleRejectResponse = useCallback(
    async (responseId: number) => {
      try {
        await rejectPlacementResponse(responseId)
        toast.success('pets:placement.messages.responseRejected')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to reject response', error)
        toast.error('pets:placement.messages.rejectFailed')
      }
    },
    [onRefresh]
  )

  const handleCancelTransfer = useCallback(
    async (transferId: number) => {
      setCancellingTransferId(transferId)
      try {
        await rejectTransfer(transferId)
        toast.success('pets:placement.messages.transferCancelled')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to cancel transfer', error)
        toast.error('pets:placement.messages.cancelFailed')
      } finally {
        setCancellingTransferId(null)
      }
    },
    [onRefresh]
  )

  const handleMessageHelper = useCallback(
    async (helperUserId: number, placementRequestId: number) => {
      const chat = await createChat(helperUserId, 'PlacementRequest', placementRequestId)
      if (chat) {
        void navigate(`/messages/${String(chat.id)}`)
      }
    },
    [createChat, navigate]
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
        await finalizePlacementRequest(requestId)
        toast.success('pets:placement.messages.petReturned')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to finalize placement request', error)
        toast.error('pets:placement.messages.returnFailed')
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
        const pendingResponses = request.responses?.filter((r) => r.status === 'responded') ?? []
        const responseCount = pendingResponses.length
        const isActive = request.status === 'active'
        const isPendingTransfer = request.status === 'pending_transfer'
        const isFostering = isFosteringType(request.request_type)
        const isTemporary = isTemporaryType(request.request_type)
        const showReturnButton = canEdit && isActive && isTemporary
        const isFinishing = finalizingId === request.id
        const acceptedResponse = getAcceptedResponse(request)
        const helperName = acceptedResponse?.helper_profile?.user?.name ?? 'the helper'
        const helperUserId = acceptedResponse?.helper_profile?.user?.id
        const pendingTransfer = acceptedResponse?.transfer_request

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
                  <Link
                    to={`/requests/${String(request.id)}`}
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    View Details
                    <ExternalLink className="h-3 w-3" />
                  </Link>
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

            {/* Pending transfer status - waiting for helper to confirm handover */}
            {isPendingTransfer && acceptedResponse && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <Clock className="h-4 w-4" />
                  <span>Waiting for {helperName} to confirm handover</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {helperUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleMessageHelper(helperUserId, request.id)}
                      disabled={creatingChat}
                      className="w-full sm:flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {creatingChat ? 'Starting...' : 'Chat with Helper'}
                    </Button>
                  )}
                  {pendingTransfer && canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCancelTransfer(pendingTransfer.id)}
                      disabled={cancellingTransferId === pendingTransfer.id}
                      className="w-full sm:flex-1 text-destructive hover:text-destructive"
                    >
                      {cancellingTransferId === pendingTransfer.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Cancel Transfer
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Active fostering status indicator */}
            {isActive && (
              <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <Home className="h-4 w-4" />
                  <span>
                    {isFostering
                      ? 'Pet is currently with foster'
                      : request.request_type === 'pet_sitting'
                        ? 'Pet is currently with sitter'
                        : 'Placement is active'}
                  </span>
                </div>
              </div>
            )}

            {/* Pet is returned button for active temporary placements */}
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
                      {isFostering ? ' fostering' : ' pet sitting'} period and mark the placement as
                      completed.
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
          placementRequestId={activeRequest.id}
          onAccept={handleAcceptResponse}
          onReject={handleRejectResponse}
        />
      )}
    </div>
  )
}
