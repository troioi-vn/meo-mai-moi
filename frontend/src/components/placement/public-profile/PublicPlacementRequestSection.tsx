import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, X, Info } from 'lucide-react'
import { PlacementResponseModal } from '@/components/placement/PlacementResponseModal'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import type { PublicPet } from '@/api/pets'

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

export const PublicPlacementRequestSection: React.FC<Props> = ({ pet, onRefresh }) => {
  const { user } = useAuth()
  const [respondingToRequest, setRespondingToRequest] = useState<PlacementRequest | null>(null)

  const placementRequests = pet.placement_requests ?? []
  const activePlacementRequests = placementRequests.filter((pr) => pr.status === 'open')
  const isOwner = Boolean(pet.viewer_permissions?.is_owner)

  // Find user's pending transfer request for any active placement request
  const findMyPendingTransfer = (request: PlacementRequest): TransferRequest | undefined => {
    if (!user) return undefined
    return request.transfer_requests?.find(
      (tr) => tr.status === 'pending' && tr.helper_profile?.user?.id === user.id
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

  if (activePlacementRequests.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Placement Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activePlacementRequests.map((request) => {
          const myPendingTransfer = findMyPendingTransfer(request)

          return (
            <div key={request.id} className="rounded-lg border p-4 bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Available for Placement</h3>
                <Badge variant={getRequestTypeBadgeVariant(request.request_type)}>
                  {formatRequestType(request.request_type)}
                </Badge>
              </div>

              {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}

              {request.expires_at && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expires {new Date(request.expires_at).toLocaleDateString()}</span>
                </div>
              )}

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
          onSuccess={() => {
            setRespondingToRequest(null)
            onRefresh?.()
          }}
        />
      )}
    </Card>
  )
}
