import type { City, Pet, PlacementRequest, TransferRequest } from '@/types/pet'

export interface HelperProfileUser {
  id?: number
  name?: string
  email?: string
}

export type PlacementRequestType = 'foster_payed' | 'foster_free' | 'permanent'

export interface HelperProfile {
  id: number
  user_id?: number
  country?: string
  address?: string
  city_id?: number | null
  city?: string | City
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
  status?: string
  user?: HelperProfileUser
  photos?: unknown[]
  pet_types?: { id: number; name: string; placement_requests_allowed: boolean }[]
  transfer_requests?: (TransferRequest & {
    placement_request?: PlacementRequest
    pet?: Pet
  })[]
  created_at?: string
  updated_at?: string
}
