import {
  getPlacementRequestsId as generatedGetPlacementRequest,
  getPlacementRequestsIdMe as generatedGetPlacementRequestViewerContext,
  deletePlacementRequestsId as generatedDeletePlacementRequest,
  postPlacementRequestsIdFinalize as generatedFinalizePlacementRequest,
} from './generated/placement-requests/placement-requests'
import {
  getPlacementRequestsIdResponses as generatedGetPlacementResponses,
  postPlacementRequestsIdResponses as generatedSubmitPlacementResponse,
  postPlacementResponsesIdAccept as generatedAcceptPlacementResponse,
  postPlacementResponsesIdReject as generatedRejectPlacementResponse,
  postPlacementResponsesIdCancel as generatedCancelPlacementResponse,
} from './generated/placement-request-responses/placement-request-responses'
import {
  postTransferRequestsIdConfirm as generatedConfirmTransfer,
  postTransferRequestsIdReject as generatedRejectTransfer,
  deleteTransferRequestsId as generatedCancelTransfer,
} from './generated/transfer-requests/transfer-requests'
import type {
  PlacementRequestResponse,
  PlacementRequestDetail,
  PlacementRequestViewerContext,
  TransferRequest,
} from '@/types/placement'

// ============================================================
// PlacementRequest Detail API
// ============================================================

/**
 * Get placement request details by ID
 * Returns role-shaped data based on the viewer (owner/helper/admin/public)
 */
export async function getPlacementRequest(id: number): Promise<PlacementRequestDetail> {
  const response = await generatedGetPlacementRequest(id)
  return response as unknown as PlacementRequestDetail
}

/**
 * Get viewer context for a placement request (authenticated users only)
 * Returns viewer's role, their response, transfer, and available actions
 */
export async function getPlacementRequestViewerContext(
  id: number
): Promise<PlacementRequestViewerContext> {
  const response = await generatedGetPlacementRequestViewerContext(id)
  return response as unknown as PlacementRequestViewerContext
}

/**
 * Delete a placement request (owner/admin only, when open)
 */
export async function deletePlacementRequest(id: number): Promise<void> {
  await generatedDeletePlacementRequest(id)
}

/**
 * Finalize a placement request (mark pet as returned - owner only, for temporary placements)
 */
export async function finalizePlacementRequest(id: number): Promise<void> {
  await generatedFinalizePlacementRequest(id)
}

// ============================================================
// PlacementRequestResponse API (helper responses to placement requests)
// ============================================================

/**
 * List responses for a placement request (owner view)
 */
export async function getPlacementResponses(
  placementRequestId: number
): Promise<PlacementRequestResponse[]> {
  const response = await generatedGetPlacementResponses(placementRequestId)
  return response as unknown as PlacementRequestResponse[]
}

/**
 * Submit response to placement request (helper action)
 */
export async function submitPlacementResponse(
  placementRequestId: number,
  payload: { helper_profile_id?: number; message?: string }
): Promise<PlacementRequestResponse> {
  const response = await generatedSubmitPlacementResponse(
    placementRequestId,
    payload as Parameters<typeof generatedSubmitPlacementResponse>[1]
  )
  return response as unknown as PlacementRequestResponse
}

/**
 * Accept response (owner action) - creates TransferRequest for non-pet_sitting types
 */
export async function acceptPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const response = await generatedAcceptPlacementResponse(responseId)
  return response as unknown as PlacementRequestResponse
}

/**
 * Reject response (owner action)
 */
export async function rejectPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const response = await generatedRejectPlacementResponse(responseId)
  return response as unknown as PlacementRequestResponse
}

/**
 * Cancel response (helper action - before acceptance)
 */
export async function cancelPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const response = await generatedCancelPlacementResponse(responseId)
  return response as unknown as PlacementRequestResponse
}

// ============================================================
// TransferRequest API (physical handover confirmation)
// ============================================================

/**
 * Confirm transfer/handover (helper action - after response is accepted)
 * Only for permanent, foster_free, foster_paid request types
 */
export async function confirmTransfer(transferId: number): Promise<TransferRequest> {
  const response = await generatedConfirmTransfer(transferId)
  return response as unknown as TransferRequest
}

/**
 * Reject transfer (owner action - decides not to proceed with accepted response)
 */
export async function rejectTransfer(transferId: number): Promise<TransferRequest> {
  const response = await generatedRejectTransfer(transferId)
  return response as unknown as TransferRequest
}

/**
 * Cancel transfer (either party)
 */
export async function cancelTransfer(transferId: number): Promise<void> {
  await generatedCancelTransfer(transferId)
}
