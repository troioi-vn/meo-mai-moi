import React, { useCallback, useState } from 'react'
import type { Pet } from '@/types/pet'
import { Button } from '@/components/ui/button'
import { PlacementResponseModal } from '@/components/PlacementResponseModal'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]
type TransferRequest = NonNullable<PlacementRequest['transfer_requests']>[number]

interface Props {
  pet: Pet
  activePlacementRequest: PlacementRequest
  myPendingTransfer?: TransferRequest
  onCancelTransferRequest?: (id: number) => void | Promise<void>
  onTransferResponseSuccess?: () => void
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
    <div className="border-t pt-4">
      {myPendingTransfer ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You responded to this placement request. Waiting for approval...
          </p>
          <Button variant="outline" size="sm" onClick={() => { void handleCancel() }}>
            Cancel Response
          </Button>
        </div>
      ) : (
        <Button onClick={() => { setIsRespondOpen(true) }} className="w-full">
          Respond to Placement Request
        </Button>
      )}

      <PlacementResponseModal
        isOpen={isRespondOpen}
        onClose={() => { setIsRespondOpen(false) }}
        petName={pet.name}
        petId={pet.id}
        placementRequestId={activePlacementRequest.id}
        onSuccess={onTransferResponseSuccess}
      />
    </div>
  )
}
