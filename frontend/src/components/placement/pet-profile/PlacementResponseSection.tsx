/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import React, { useCallback, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Pet } from '@/types/pet'
import type { PlacementRequestResponse, TransferRequest } from '@/types/placement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, X, MessageCircle, CheckCircle2, Loader2, HandshakeIcon } from 'lucide-react'
import { useCreateChat } from '@/hooks/useMessaging'
import { postPlacementResponsesIdCancel as cancelPlacementResponse } from '@/api/generated/placement-request-responses/placement-request-responses'
import { postTransferRequestsIdConfirm as confirmTransfer } from '@/api/generated/transfer-requests/transfer-requests'
import { toast } from '@/lib/i18n-toast'

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
  const { t } = useTranslation(['placement', 'pets', 'common'])
  const [cancelling, setCancelling] = useState(false)
  const [confirmingHandover, setConfirmingHandover] = useState(false)
  const { create: createChat, creating: creatingChat } = useCreateChat()

  const handleCancelResponse = useCallback(async () => {
    if (!myPendingResponse) return
    setCancelling(true)
    try {
      await cancelPlacementResponse(myPendingResponse.id)
      toast.success(t('placement:messages.responseCancelled'))
      onRefresh?.()
    } catch (error) {
      console.error('Failed to cancel response', error)
      toast.error(t('placement:messages.cancelResponseFailed'))
    } finally {
      setCancelling(false)
    }
  }, [myPendingResponse, onRefresh, t])

  const handleConfirmHandover = useCallback(async () => {
    if (!myPendingTransfer) return
    setConfirmingHandover(true)
    try {
      await confirmTransfer(myPendingTransfer.id)
      toast.success(t('placement:messages.handoverConfirmed'))
      onRefresh?.()
    } catch (error) {
      console.error('Failed to confirm handover', error)
      toast.error(t('placement:messages.confirmHandoverFailed'))
    } finally {
      setConfirmingHandover(false)
    }
  }, [myPendingTransfer, onRefresh, t])

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
        <h3 className="font-semibold text-foreground">{t('placement:title')}</h3>
        <Badge variant="secondary">
          {t(`placement:requestTypes.${activePlacementRequest.request_type}`)}
        </Badge>
      </div>

      {/* State 1: Response pending approval */}
      {isPending && (
        <div className="rounded-md bg-background border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t('placement:response.pending')}</span>
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
                {creatingChat
                  ? t('placement:response.startingChat')
                  : t('placement:response.chatWithOwner')}
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
              {t('placement:response.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* State 2: Response accepted, needs handover confirmation */}
      {needsHandoverConfirm && (
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">{t('placement:response.accepted')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('placement:response.confirmHandoverDescription')}
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
                  {t('common:confirming')}...
                </>
              ) : (
                <>
                  <HandshakeIcon className="h-4 w-4 mr-2" />
                  {t('placement:response.confirmHandover')}
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
                {creatingChat ? t('common:starting') : t('placement:responsesDrawer.chat')}
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
            <span className="font-medium">
              {t('placement:response.activeCaring', { name: pet.name })}
            </span>
          </div>
          {activePlacementRequest.user_id && (
            <Button
              variant="outline"
              onClick={() => void handleMessageOwner()}
              disabled={creatingChat}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {creatingChat
                ? t('placement:response.startingChat')
                : t('placement:response.chatWithOwner')}
            </Button>
          )}
        </div>
      )}

      {/* State 4: No response yet - can respond */}
      {!isPending && !isAccepted && (
        <Button className="w-full" asChild>
          <Link to={`/requests/${String(activePlacementRequest.id)}`}>
            {t('placement:response.respond')}
          </Link>
        </Button>
      )}
    </div>
  )
}
