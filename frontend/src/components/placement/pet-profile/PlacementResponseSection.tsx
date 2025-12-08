import React, { useCallback, useState } from 'react'
import type { Pet } from '@/types/pet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, X } from 'lucide-react'
import { PlacementResponseModal } from '@/components/placement/PlacementResponseModal'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]
type TransferRequest = NonNullable<PlacementRequest['transfer_requests']>[number]

interface Props {
  pet: Pet
  activePlacementRequest: PlacementRequest
  myPendingTransfer?: TransferRequest
  onCancelTransferRequest?: (id: number) => void | Promise<void>
  onTransferResponseSuccess?: () => void
}

const formatRequestType = (type: string): string => {
  const labels: Record<string, string> = {
    foster_free: 'Foster (Free)',
    foster_payed: 'Foster (Paid)',
    permanent: 'Permanent Adoption',
  }
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const PlacementResponseSection: React.FC<Props> = ({
  pet,
  activePlacementRequest,
  myPendingTransfer,
  onCancelTransferRequest,
  onTransferResponseSuccess,
}) => {
  const [isRespondOpen, setIsRespondOpen] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!myPendingTransfer || !onCancelTransferRequest) return
    try {
      await onCancelTransferRequest(myPendingTransfer.id)
    } catch (error) {
      console.error('Failed to cancel transfer request', error)
    }
  }, [myPendingTransfer, onCancelTransferRequest])

  return (
    <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Placement Request</h3>
        <Badge variant="secondary">{formatRequestType(activePlacementRequest.request_type)}</Badge>
      </div>

      {myPendingTransfer ? (
        <div className="rounded-md bg-background border p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Your response is pending approval</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleCancel()
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
            setIsRespondOpen(true)
          }}
          className="w-full"
        >
          Respond to Placement Request
        </Button>
      )}

      <PlacementResponseModal
        isOpen={isRespondOpen}
        onClose={() => {
          setIsRespondOpen(false)
        }}
        petName={pet.name}
        petId={pet.id}
        placementRequestId={activePlacementRequest.id}
        requestType={activePlacementRequest.request_type}
        petCity={pet.city}
        petCountry={pet.country}
        onSuccess={onTransferResponseSuccess}
      />
    </div>
  )
}
