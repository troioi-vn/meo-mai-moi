import { api } from './axios'
import type {
  PlacementRequestResponse,
  TransferRequest,
  PlacementRequestDetail,
  PlacementRequestViewerContext,
} from '@/types/placement'

// ============================================================
// PlacementRequest Detail API
// ============================================================

/**
 * Get placement request details by ID
 * Returns role-shaped data based on the viewer (owner/helper/admin/public)
 */
export async function getPlacementRequest(id: number): Promise<PlacementRequestDetail> {
  const { data } = await api.get<{ data: PlacementRequestDetail }>(
    `/placement-requests/${String(id)}`
  )
  return data.data
}

/**
 * Get viewer context for a placement request (authenticated users only)
 * Returns viewer's role, their response, transfer, and available actions
 */
export async function getPlacementRequestViewerContext(
  id: number
): Promise<PlacementRequestViewerContext> {
  const { data } = await api.get<{ data: PlacementRequestViewerContext }>(
    `/placement-requests/${String(id)}/me`
  )
  return data.data
}

/**
 * Delete a placement request (owner/admin only, when open)
 */
export async function deletePlacementRequest(id: number): Promise<void> {
  await api.delete(`/placement-requests/${String(id)}`)
}

/**
 * Finalize a placement request (mark pet as returned - owner only, for temporary placements)
 */
export async function finalizePlacementRequest(id: number): Promise<void> {
  await api.post(`/placement-requests/${String(id)}/finalize`)
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
  const { data } = await api.get<{ data: PlacementRequestResponse[] }>(
    `/placement-requests/${String(placementRequestId)}/responses`
  )
  return data.data
}

/**
 * Submit response to placement request (helper action)
 */
export async function submitPlacementResponse(
  placementRequestId: number,
  payload: { helper_profile_id?: number; message?: string }
): Promise<PlacementRequestResponse> {
  const { data } = await api.post<{ data: PlacementRequestResponse }>(
    `/placement-requests/${String(placementRequestId)}/responses`,
    payload
  )
  return data.data
}

/**
 * Accept response (owner action) - creates TransferRequest for non-pet_sitting types
 */
export async function acceptPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const { data } = await api.post<{ data: PlacementRequestResponse }>(
    `/placement-responses/${String(responseId)}/accept`
  )
  return data.data
}

/**
 * Reject response (owner action)
 */
export async function rejectPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const { data } = await api.post<{ data: PlacementRequestResponse }>(
    `/placement-responses/${String(responseId)}/reject`
  )
  return data.data
}

/**
 * Cancel response (helper action - before acceptance)
 */
export async function cancelPlacementResponse(
  responseId: number
): Promise<PlacementRequestResponse> {
  const { data } = await api.post<{ data: PlacementRequestResponse }>(
    `/placement-responses/${String(responseId)}/cancel`
  )
  return data.data
}

// ============================================================
// TransferRequest API (physical handover confirmation)
// ============================================================

/**
 * Confirm transfer/handover (helper action - after response is accepted)
 * Only for permanent, foster_free, foster_paid request types
 */
export async function confirmTransfer(transferId: number): Promise<TransferRequest> {
  const { data } = await api.post<{ data: TransferRequest }>(
    `/transfer-requests/${String(transferId)}/confirm`
  )
  return data.data
}

/**
 * Reject transfer (owner action - decides not to proceed with accepted response)
 */
export async function rejectTransfer(transferId: number): Promise<TransferRequest> {
  const { data } = await api.post<{ data: TransferRequest }>(
    `/transfer-requests/${String(transferId)}/reject`
  )
  return data.data
}

/**
 * Cancel transfer (either party)
 */
export async function cancelTransfer(transferId: number): Promise<void> {
  await api.delete(`/transfer-requests/${String(transferId)}`)
}
