import type { Pet } from './pet'

// PlacementRequestResponse statuses
export type PlacementResponseStatus = 'responded' | 'accepted' | 'rejected' | 'cancelled'

// PlacementRequest statuses
export type PlacementRequestStatus =
  | 'open'
  | 'pending_transfer'
  | 'active'
  | 'finalized'
  | 'expired'
  | 'cancelled'

// PlacementRequest types
export type PlacementRequestType = 'permanent' | 'foster_free' | 'foster_paid' | 'pet_sitting'

// TransferRequest statuses (for physical handover)
export type TransferRequestStatus = 'pending' | 'confirmed' | 'rejected' | 'expired' | 'canceled'

export interface HelperProfileUser {
  id?: number
  name?: string
  email?: string
}

export interface HelperProfileSummary {
  id: number
  city?: string
  state?: string
  address?: string
  zip_code?: string
  phone?: string
  phone_number?: string
  about?: string
  user?: HelperProfileUser
  photos?: unknown[]
  created_at?: string
  updated_at?: string
}

export interface TransferRequest {
  id: number
  placement_request_id: number
  placement_request_response_id: number
  from_user_id: number
  to_user_id: number
  status: TransferRequestStatus
  confirmed_at?: string | null
  rejected_at?: string | null
  created_at: string
  updated_at: string
}

export interface PlacementRequestResponse {
  id: number
  placement_request_id: number
  helper_profile_id: number
  status: PlacementResponseStatus
  message?: string | null
  responded_at: string
  accepted_at?: string | null
  rejected_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
  helper_profile?: HelperProfileSummary
  transfer_request?: TransferRequest | null // Only present when accepted (non-pet_sitting)
}

export interface PlacementRequest {
  id: number
  pet_id: number
  user_id?: number
  // Allow arbitrary strings for backend enum flexibility
  request_type: string
  status: string
  notes?: string | null
  expires_at?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at: string
  updated_at: string
  responses?: PlacementRequestResponse[]
  transfer_requests?: TransferRequest[]
  pet?: Pet
}

// Status display labels for UI
export const PlacementRequestStatusLabels: Record<string, string> = {
  open: 'Open',
  pending_transfer: 'Awaiting Handover',
  active: 'Active',
  finalized: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

export const PlacementResponseStatusLabels: Record<string, string> = {
  responded: 'Pending Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const TransferRequestStatusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  expired: 'Expired',
  canceled: 'Cancelled',
}

export const PlacementRequestTypeLabels: Record<string, string> = {
  permanent: 'Permanent Adoption',
  foster_free: 'Foster (Free)',
  foster_paid: 'Foster (Paid)',
  pet_sitting: 'Pet Sitting',
}

// Helper functions
export const formatRequestType = (type: string): string => {
  return (
    PlacementRequestTypeLabels[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export const formatStatus = (status: string): string => {
  return (
    PlacementRequestStatusLabels[status] ??
    status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export const isFosteringType = (type: string): boolean => {
  return type === 'foster_free' || type === 'foster_paid'
}

export const isTemporaryType = (type: string): boolean => {
  return type === 'foster_free' || type === 'foster_paid' || type === 'pet_sitting'
}

export const requiresHandover = (type: string): boolean => {
  // pet_sitting doesn't require handover confirmation
  return type === 'permanent' || type === 'foster_free' || type === 'foster_paid'
}
