import type { City, Pet, PlacementRequest } from '@/types/pet'
import type { PlacementRequestResponse } from '@/types/placement'

export interface HelperProfileUser {
  id?: number
  name?: string
  email?: string
}

export type PlacementRequestType = 'foster_paid' | 'foster_free' | 'permanent' | 'pet_sitting'
export type HelperProfileStatus = 'active' | 'archived' | 'deleted'

export interface HelperProfile {
  id: number
  user_id?: number
  country?: string
  address?: string
  city_id?: number | null
  city?: string | City
  cities?: City[]
  state?: string
  zip_code?: string
  phone_number?: string
  phone?: string
  contact_info?: string
  experience?: string
  about?: string
  has_pets?: boolean
  has_children?: boolean
  request_types?: PlacementRequestType[]
  approval_status?: string
  approved_at?: string | null
  status?: HelperProfileStatus
  user?: HelperProfileUser
  photos?: unknown[]
  pet_types?: { id: number; name: string; placement_requests_allowed: boolean }[]
  // Updated: now using PlacementRequestResponse instead of TransferRequest
  placement_responses?: (PlacementRequestResponse & {
    placement_request?: PlacementRequest
    pet?: Pet
  })[]
  created_at?: string
  updated_at?: string
  archived_at?: string
  restored_at?: string
}
