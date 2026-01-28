import React, { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { Pet } from '@/types/pet'
import type { PlacementRequestResponse, TransferRequest } from '@/types/placement'
import { formatRequestType, requiresHandover } from '@/types/placement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, X, MessageCircle, CheckCircle2, Loader2, HandshakeIcon } from 'lucide-react'
import { useCreateChat } from '@/hooks/useMessaging'
import { postPlacementResponsesIdCancel as cancelPlacementResponse } from '@/api/generated/placement-request-responses/placement-request-responses'
import { postTransferRequestsIdConfirm as confirmTransfer } from '@/api/generated/transfer-requests/transfer-requests'
import { toast } from 'sonner'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

interface Props {
  pet: Pet
  activePlacementRequest: PlacementRequest
  /** User's pending response (status='responded') - waiting for owner approval */
  myPendingResponse?: PlacementRequestResponse
  /** User's accepted response (status='accepted') */
  myAcceptedResponse?: PlacementRequestResponse
  /** User's pending transfer request (for handover confirmation) */
  myPendingTransfer?: TransferRequest
  onRefresh?: () => void
}

export const PlacementResponseSection: React.FC<Props> = ({
  pet,
  activePlacementRequest,
  myPendingResponse,
  myAcceptedResponse,
  myPendingTransfer,
  onRefresh,
}) => {
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [confirmingHandover, setConfirmingHandover] = useState(false)
  const { create: createChat, creating: creatingChat } = useCreateChat()

  const handleCancelResponse = useCallback(async () => {
    if (!myPendingResponse) return
    setCancelling(true)
    try {
      await cancelPlacementResponse(myPendingResponse.id)
      toast.success('Response cancelled')
      onRefresh?.()
    } catch (error) {
      console.error('Failed to cancel response', error)
      toast.error('Failed to cancel response')
    } finally {
      setCancelling(false)
    }
  }, [myPendingResponse, onRefresh])

  const handleConfirmHandover = useCallback(async () => {
    if (!myPendingTransfer) return
    setConfirmingHandover(true)
    try {
      await confirmTransfer(myPendingTransfer.id)
      toast.success('Handover confirmed! You are now responsible for this pet.')
      onRefresh?.()
    } catch (error) {
      console.error('Failed to confirm handover', error)
      toast.error('Failed to confirm handover')
    } finally {
      setConfirmingHandover(false)
    }
  }, [myPendingTransfer, onRefresh])

  const handleMessageOwner = useCallback(async () => {
    if (!activePlacementRequest.user_id) return
    const chat = await createChat(
      activePlacementRequest.user_id,
      'PlacementRequest',
      activePlacementRequest.id
    )
    if (chat) {
      void navigate(`/messages/${String(chat.id)}`)
    }
  }, [activePlacementRequest.user_id, activePlacementRequest.id, createChat, navigate])

  // Determine state
  const isPending = Boolean(myPendingResponse)
  const isAccepted = Boolean(myAcceptedResponse)
  const needsHandoverConfirm =
    isAccepted && myPendingTransfer && requiresHandover(activePlacementRequest.request_type)
  const isActiveWithoutHandover =
    isAccepted && !needsHandoverConfirm && activePlacementRequest.status === 'active'

  return (
    <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Placement Request</h3>
        <Badge variant="secondary">{formatRequestType(activePlacementRequest.request_type)}</Badge>
      </div>

      {/* State 1: Response pending approval */}
      {isPending && (
        <div className="rounded-md bg-background border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Your response is pending approval</span>
          </div>
          <div className="space-y-2">
            {activePlacementRequest.user_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleMessageOwner()
                }}
                disabled={creatingChat}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {creatingChat ? 'Starting chat...' : 'Chat with Owner'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleCancelResponse()
              }}
              disabled={cancelling}
              className="w-full text-muted-foreground"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Cancel Response
            </Button>
          </div>
        </div>
      )}

      {/* State 2: Response accepted, needs handover confirmation */}
      {needsHandoverConfirm && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Your response was accepted!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Please confirm once you have received the pet physically.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => void handleConfirmHandover()}
              disabled={confirmingHandover}
              className="flex-1"
            >
              {confirmingHandover ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <HandshakeIcon className="h-4 w-4 mr-2" />
                  Confirm Handover
                </>
              )}
            </Button>
            {activePlacementRequest.user_id && (
              <Button
                variant="outline"
                onClick={() => void handleMessageOwner()}
                disabled={creatingChat}
                className="flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {creatingChat ? 'Starting...' : 'Chat'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* State 3: Active placement (pet_sitting or after foster confirm) */}
      {isActiveWithoutHandover && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">You are currently caring for {pet.name}</span>
          </div>
          {activePlacementRequest.user_id && (
            <Button
              variant="outline"
              onClick={() => void handleMessageOwner()}
              disabled={creatingChat}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {creatingChat ? 'Starting chat...' : 'Chat with Owner'}
            </Button>
          )}
        </div>
      )}

      {/* State 4: No response yet - can respond */}
      {!isPending && !isAccepted && (
        <Button className="w-full" asChild>
          <Link to={`/requests/${String(activePlacementRequest.id)}`}>
            Respond to Placement Request
          </Link>
        </Button>
      )}
    </div>
  )
}
