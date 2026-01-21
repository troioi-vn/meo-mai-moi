import { useMemo } from 'react'
import type { Pet } from '@/types/pet'
import { petSupportsCapability } from '@/types/pet'
import type { PlacementRequestResponse, TransferRequest } from '@/types/placement'

type PlacementRequest = NonNullable<Pet['placement_requests']>[number]

const isPlacementRequestVisible = (request: PlacementRequest): boolean => {
  // Open, pending_transfer, and active requests are visible/actionable
  return (
    request.status === 'open' ||
    request.status === 'pending_transfer' ||
    request.status === 'active'
  )
}

export interface PlacementInfo {
  supportsPlacement: boolean
  hasActivePlacementRequest: boolean
  activePlacementRequest: PlacementRequest | undefined
  /** User's pending response (status='responded') - waiting for owner approval */
  myPendingResponse: PlacementRequestResponse | undefined
  /** User's accepted response (status='accepted') - waiting for handover confirmation or active */
  myAcceptedResponse: PlacementRequestResponse | undefined
  /** User's pending transfer request (for handover confirmation) */
  myPendingTransfer: TransferRequest | undefined
}

export const usePlacementInfo = (pet: Pet, userId?: number): PlacementInfo => {
  return useMemo(() => {
    const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
    if (!supportsPlacement) {
      return {
        supportsPlacement,
        hasActivePlacementRequest: false,
        activePlacementRequest: undefined,
        myPendingResponse: undefined,
        myAcceptedResponse: undefined,
        myPendingTransfer: undefined,
      }
    }

    const placementRequests = pet.placement_requests ?? []
    const activePlacementRequest = placementRequests.find((request) =>
      isPlacementRequestVisible(request)
    )

    const hasActivePlacementRequest =
      pet.placement_request_active === true ||
      placementRequests.some((request) => isPlacementRequestVisible(request))

    if (!userId || !placementRequests.length) {
      return {
        supportsPlacement,
        hasActivePlacementRequest,
        activePlacementRequest,
        myPendingResponse: undefined,
        myAcceptedResponse: undefined,
        myPendingTransfer: undefined,
      }
    }

    // Find user's pending response (status='responded') - waiting for owner approval
    const myPendingResponse = placementRequests.reduce<PlacementRequestResponse | undefined>(
      (found, request) => {
        if (found) return found
        return request.responses?.find((response) => {
          if (response.status !== 'responded') return false
          return response.helper_profile?.user?.id === userId
        })
      },
      undefined
    )

    // Find user's accepted response (status='accepted')
    const myAcceptedResponse = placementRequests.reduce<PlacementRequestResponse | undefined>(
      (found, request) => {
        if (found) return found
        return request.responses?.find((response) => {
          if (response.status !== 'accepted') return false
          return response.helper_profile?.user?.id === userId
        })
      },
      undefined
    )

    // Find user's pending transfer request (for handover confirmation)
    // This is the TransferRequest associated with the accepted response
    const myPendingTransfer: TransferRequest | undefined =
      myAcceptedResponse?.transfer_request?.status === 'pending'
        ? myAcceptedResponse.transfer_request
        : undefined

    return {
      supportsPlacement,
      hasActivePlacementRequest,
      activePlacementRequest,
      myPendingResponse,
      myAcceptedResponse,
      myPendingTransfer,
    }
  }, [pet, userId])
}
