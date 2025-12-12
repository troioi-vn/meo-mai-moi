import { useMemo } from 'react'
import type { Pet } from '@/types/pet'
import { petSupportsCapability } from '@/types/pet'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]
type TransferRequest = NonNullable<PlacementRequest['transfer_requests']>[number]

const isPlacementRequestActive = (request: PlacementRequest): boolean => {
  return request.status === 'open' || request.status === 'finalized'
}

export const usePlacementInfo = (pet: Pet, userId?: number) => {
  return useMemo(() => {
    const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
    if (!supportsPlacement) {
      return {
        supportsPlacement,
        hasActivePlacementRequest: false,
        activePlacementRequest: undefined as PlacementRequest | undefined,
        myPendingTransfer: undefined as TransferRequest | undefined,
      }
    }

    const placementRequests = pet.placement_requests ?? []
    const activePlacementRequest =
      placementRequests.find((request) => isPlacementRequestActive(request)) ??
      placementRequests.find(
        (request) => request.status === 'open' || request.status === 'finalized'
      )

    const hasActivePlacementRequest =
      pet.placement_request_active === true ||
      placementRequests.some((request) => isPlacementRequestActive(request))

    if (!userId || !placementRequests.length) {
      return {
        supportsPlacement,
        hasActivePlacementRequest,
        activePlacementRequest,
        myPendingTransfer: undefined,
      }
    }

    const myPendingTransfer = placementRequests.reduce<TransferRequest | undefined>(
      (found, request) => {
        if (found) return found
        return request.transfer_requests?.find((transfer) => {
          if (transfer.status !== 'pending') return false
          if (transfer.initiator_user_id && transfer.initiator_user_id === userId) return true
          return transfer.helper_profile?.user?.id === userId
        })
      },
      undefined
    )

    return {
      supportsPlacement,
      hasActivePlacementRequest,
      activePlacementRequest,
      myPendingTransfer,
    }
  }, [pet, userId])
}
