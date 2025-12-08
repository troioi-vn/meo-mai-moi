import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, X, Info, CheckCircle2, Loader2 } from 'lucide-react'
import { PlacementResponseModal } from '@/components/placement/PlacementResponseModal'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import type { PublicPet } from '@/api/pets'
import { getTransferHandover, completeHandover } from '@/api/handovers'

type PlacementRequest = NonNullable<PublicPet['placement_requests']>[number]
type TransferRequest = NonNullable<PlacementRequest['transfer_requests']>[number]

interface Props {
  pet: PublicPet
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
    fulfilled: 'Awaiting Confirmation',
    pending_transfer: 'Transfer in Progress',
    active: 'Active Fostering',
    finalized: 'Completed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  }
  return labels[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const PublicPlacementRequestSection: React.FC<Props> = ({ pet, onRefresh }) => {
  const { user } = useAuth()
  const [respondingToRequest, setRespondingToRequest] = useState<PlacementRequest | null>(null)
  const [confirmingRehomingId, setConfirmingRehomingId] = useState<number | null>(null)

  const placementRequests = pet.placement_requests ?? []
  // Show open and fulfilled placement requests (fulfilled means awaiting helper confirmation)
  const visiblePlacementRequests = placementRequests.filter(
    (pr) => pr.status === 'open' || pr.status === 'fulfilled'
  )
  const isOwner = Boolean(pet.viewer_permissions?.is_owner)

  // Find user's pending transfer request for any active placement request
  const findMyPendingTransfer = (request: PlacementRequest): TransferRequest | undefined => {
    if (!user) return undefined
    return request.transfer_requests?.find(
      (tr) => tr.status === 'pending' && tr.helper_profile?.user?.id === user.id
    )
  }

  // Find user's accepted transfer request (for fulfilled placement requests)
  const findMyAcceptedTransfer = (request: PlacementRequest): TransferRequest | undefined => {
    if (!user) return undefined
    return request.transfer_requests?.find(
      (tr) => tr.status === 'accepted' && tr.helper_profile?.user?.id === user.id
    )
  }

  const handleCancelTransferRequest = useCallback(
    async (transferRequestId: number) => {
      try {
        await api.delete(`transfer-requests/${String(transferRequestId)}`)
        toast.success('Your response has been cancelled')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to cancel transfer request', error)
        toast.error('Failed to cancel your response')
      }
    },
    [onRefresh]
  )

  const handleConfirmRehoming = useCallback(
    async (transferRequest: TransferRequest) => {
      setConfirmingRehomingId(transferRequest.id)
      try {
        // First, get the handover for this transfer request
        const handover = await getTransferHandover(transferRequest.id)
        if (!handover) {
          toast.error('No handover found for this transfer request')
          return
        }

        // Complete the handover
        await completeHandover(handover.id)
        toast.success('Rehoming confirmed successfully!')
        onRefresh?.()
      } catch (error) {
        console.error('Failed to confirm rehoming', error)
        toast.error('Failed to confirm rehoming. Please try again.')
      } finally {
        setConfirmingRehomingId(null)
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
          const myPendingTransfer = findMyPendingTransfer(request)
          const myAcceptedTransfer = findMyAcceptedTransfer(request)
          const isConfirming = confirmingRehomingId === myAcceptedTransfer?.id

          return (
            <div key={request.id} className="rounded-lg border p-4 bg-muted/50 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">
                  {request.status === 'open' ? 'Available for Placement' : 'Placement in Progress'}
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

              {request.expires_at && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expires {new Date(request.expires_at).toLocaleDateString()}</span>
                </div>
              )}

              {/* Show Confirm Rehoming button for accepted helper when status is fulfilled */}
              {request.status === 'fulfilled' && myAcceptedTransfer && (
                <div className="rounded-md bg-background border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Your response was accepted!</span>
                  </div>
                  <Button
                    onClick={() => {
                      void handleConfirmRehoming(myAcceptedTransfer)
                    }}
                    disabled={isConfirming}
                    className="w-full"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      'Confirm Rehoming'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Click to confirm you have received the pet
                  </p>
                </div>
              )}

              {/* Show regular UI for open placement requests */}
              {request.status === 'open' && (
                <>
                  {user ? (
                    isOwner ? (
                      <Alert variant="info" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          You cannot respond to your own pet's placement request.
                        </AlertDescription>
                      </Alert>
                    ) : myPendingTransfer ? (
                      <div className="rounded-md bg-background border p-3 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Your response is pending approval</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void handleCancelTransferRequest(myPendingTransfer.id)
                          }}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel Response
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setRespondingToRequest(request)
                        }}
                        className="w-full"
                      >
                        Respond to Placement Request
                      </Button>
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
          petCity={pet.city}
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
