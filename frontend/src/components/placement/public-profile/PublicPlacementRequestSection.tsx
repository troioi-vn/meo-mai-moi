import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  X,
  Info,
  CheckCircle2,
  MessageCircle,
  Loader2,
  HandshakeIcon,
  Home,
} from 'lucide-react'
import { PlacementResponseModal } from '@/components/placement/PlacementResponseModal'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import type { PublicPet } from '@/api/pets'
import { useCreateChat } from '@/hooks/useMessaging'
import type { PlacementRequestResponse, TransferRequest } from '@/types/placement'
import {
  formatRequestType,
  formatStatus,
  requiresHandover,
  isTemporaryType,
} from '@/types/placement'
import { cancelPlacementResponse, confirmTransfer } from '@/api/placement'

type PlacementRequest = NonNullable<PublicPet['placement_requests']>[number]

interface Props {
  pet: PublicPet
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
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
  switch (status) {
    case 'open':
      return 'default'
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

export const PublicPlacementRequestSection: React.FC<Props> = ({ pet, onRefresh }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const [respondingToRequest, setRespondingToRequest] = useState<PlacementRequest | null>(null)
  const [confirmingTransferId, setConfirmingTransferId] = useState<number | null>(null)
  const [cancellingResponseId, setCancellingResponseId] = useState<number | null>(null)

  const placementRequests = pet.placement_requests ?? []
  // Show open, pending_transfer, and active placement requests
  const visiblePlacementRequests = placementRequests.filter(
    (pr) => pr.status === 'open' || pr.status === 'pending_transfer' || pr.status === 'active'
  )
  const isOwner = Boolean(pet.viewer_permissions?.is_owner)

  // Find user's pending response (status='responded') for any placement request
  const findMyPendingResponse = (
    request: PlacementRequest
  ): PlacementRequestResponse | undefined => {
    if (!user) return undefined
    return request.responses?.find(
      (r) => r.status === 'responded' && r.helper_profile?.user?.id === user.id
    )
  }

  // Find user's accepted response (status='accepted') for any placement request
  const findMyAcceptedResponse = (
    request: PlacementRequest
  ): PlacementRequestResponse | undefined => {
    if (!user) return undefined
    return request.responses?.find(
      (r) => r.status === 'accepted' && r.helper_profile?.user?.id === user.id
    )
  }

  // Get pending transfer request from accepted response
  const getPendingTransfer = (
    acceptedResponse: PlacementRequestResponse | undefined
  ): TransferRequest | undefined => {
    if (!acceptedResponse?.transfer_request) return undefined
    if (acceptedResponse.transfer_request.status === 'pending') {
      return acceptedResponse.transfer_request
    }
    return undefined
  }

  const handleCancelResponse = useCallback(
    async (responseId: number) => {
      setCancellingResponseId(responseId)
      try {
        await cancelPlacementResponse(responseId)
        toast.success('Your response has been cancelled')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to cancel response', error)
        toast.error('Failed to cancel your response')
      } finally {
        setCancellingResponseId(null)
      }
    },
    [onRefresh]
  )

  const handleMessageOwner = useCallback(
    async (recipientId: number, placementRequestId: number) => {
      const chat = await createChat(recipientId, 'PlacementRequest', placementRequestId)
      if (chat) {
        void navigate(`/messages/${String(chat.id)}`)
      }
    },
    [createChat, navigate]
  )

  const handleConfirmTransfer = useCallback(
    async (transferId: number) => {
      setConfirmingTransferId(transferId)
      try {
        await confirmTransfer(transferId)
        toast.success('Handover confirmed! You are now responsible for this pet.')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to confirm transfer', error)
        toast.error('Failed to confirm handover. Please try again.')
      } finally {
        setConfirmingTransferId(null)
      }
    },
    [onRefresh]
  )

  if (visiblePlacementRequests.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Placement Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visiblePlacementRequests.map((request) => {
          const myPendingResponse = findMyPendingResponse(request)
          const myAcceptedResponse = findMyAcceptedResponse(request)
          const myPendingTransfer = getPendingTransfer(myAcceptedResponse)
          const needsHandoverConfirm =
            myAcceptedResponse && myPendingTransfer && requiresHandover(request.request_type)
          const isActiveWithUser = request.status === 'active' && myAcceptedResponse

          return (
            <div key={request.id} className="rounded-lg border p-4 bg-muted/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">
                  {request.status === 'open'
                    ? 'Available for Placement'
                    : request.status === 'pending_transfer'
                      ? 'Awaiting Handover'
                      : request.status === 'active'
                        ? 'Active Placement'
                        : 'Placement in Progress'}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant={getRequestTypeBadgeVariant(request.request_type)}>
                    {formatRequestType(request.request_type)}
                  </Badge>
                  {request.status !== 'open' && (
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {formatStatus(request.status)}
                    </Badge>
                  )}
                </div>
              </div>

              {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}

              {request.expires_at && request.status === 'open' && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expires {new Date(request.expires_at).toLocaleDateString()}</span>
                </div>
              )}

              {/* State: Response accepted, needs handover confirmation */}
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
                      onClick={() => void handleConfirmTransfer(myPendingTransfer.id)}
                      disabled={confirmingTransferId === myPendingTransfer.id}
                      className="flex-1"
                    >
                      {confirmingTransferId === myPendingTransfer.id ? (
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
                    {request.user_id != null && (
                      <Button
                        variant="outline"
                        onClick={() => void handleMessageOwner(request.user_id, request.id)}
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

              {/* State: Active placement (user is caring for pet) */}
              {isActiveWithUser && !needsHandoverConfirm && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Home className="h-4 w-4" />
                    <span className="font-medium">You are currently caring for {pet.name}</span>
                  </div>
                  {isTemporaryType(request.request_type) && (
                    <p className="text-xs text-muted-foreground">
                      The owner will mark the placement as complete when the pet is returned.
                    </p>
                  )}
                  {request.user_id != null && (
                    <Button
                      variant="outline"
                      onClick={() => void handleMessageOwner(request.user_id, request.id)}
                      disabled={creatingChat}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {creatingChat ? 'Starting chat...' : 'Chat with Owner'}
                    </Button>
                  )}
                </div>
              )}

              {/* Show regular UI for open placement requests (no accepted response) */}
              {request.status === 'open' && !myAcceptedResponse && (
                <>
                  {user ? (
                    isOwner ? (
                      <Alert variant="info" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          You cannot respond to your own pet&apos;s placement request.
                        </AlertDescription>
                      </Alert>
                    ) : myPendingResponse ? (
                      <div className="rounded-md bg-background border p-3 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Your response is pending approval</span>
                        </div>
                        <div className="space-y-2">
                          {request.user_id != null && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleMessageOwner(request.user_id, request.id)}
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
                            onClick={() => void handleCancelResponse(myPendingResponse.id)}
                            disabled={cancellingResponseId === myPendingResponse.id}
                            className="w-full"
                          >
                            {cancellingResponseId === myPendingResponse.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            Cancel Response
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            setRespondingToRequest(request)
                          }}
                          className="w-full"
                        >
                          Respond to Placement Request
                        </Button>
                        {request.user_id != null && (
                          <Button
                            variant="outline"
                            onClick={() => void handleMessageOwner(request.user_id, request.id)}
                            disabled={creatingChat}
                            className="w-full"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {creatingChat ? 'Starting chat...' : 'Message Owner'}
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      <a href="/login" className="text-primary hover:underline">
                        Sign in
                      </a>{' '}
                      to respond to this placement request
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </CardContent>

      {respondingToRequest && (
        <PlacementResponseModal
          isOpen={true}
          onClose={() => {
            setRespondingToRequest(null)
          }}
          petName={pet.name}
          petId={pet.id}
          placementRequestId={respondingToRequest.id}
          requestType={respondingToRequest.request_type}
          petCity={typeof pet.city === 'string' ? pet.city : pet.city?.name}
          petCountry={pet.country}
          onSuccess={() => {
            setRespondingToRequest(null)
            onRefresh?.()
          }}
        />
      )}
    </Card>
  )
}
