export interface PetType {
  id: number
  name: string
  slug: string
  description?: string
  is_active: boolean
  is_system: boolean
  display_order: number
  placement_requests_allowed: boolean
  weight_tracking_allowed?: boolean
  microchips_allowed?: boolean
  created_at: string
  updated_at: string
}

export interface Pet {
  id: number
  name: string
  breed: string
  birthday: string // ISO date string
  location: string
  description: string
  user_id: number
  pet_type_id: number
  status: 'active' | 'lost' | 'deceased' | 'deleted'
  imageUrl?: string
  photo_url?: string // Backend API photo URL
  photo?: { id: number; url: string } | null
  created_at: string
  updated_at: string
  pet_type: PetType
  user: {
    id: number
    name: string
    email: string
    location?: string
  }
  viewer_permissions?: {
    can_edit?: boolean
    can_view_contact?: boolean
    can_delete?: boolean
  }
  placement_requests?: PlacementRequest[]
  // Convenience flag from backend (optional) used by PetCard
  placement_request_active?: boolean
  foster_assignment?: {
    id: number
    status: string
    expected_end_date?: string
    foster_user?: {
      id: number
      name: string
    }
  }
  ownership_transfers?: {
    id: number
    occurred_at: string
    to_user?: {
      id: number
      name: string
    }
  }[]
}

export interface PlacementRequest {
  id: number
  pet_id: number

  user_id?: number
  // Support backend enums and allow arbitrary strings to avoid redundant type constituents rule
  request_type: string
  status: string
  notes?: string
  expires_at?: string
  // Optional date-range fields used by filters/tests
  start_date?: string
  end_date?: string
  is_active?: boolean
  transfer_requests?: TransferRequest[]
  created_at?: string
  updated_at?: string
}

export interface TransferRequest {
  id: number
  pet_id?: number
  
  placement_request_id?: number
  helper_profile_id?: number
  initiator_user_id?: number
  requested_relationship_type?: string
  fostering_type?: string | null
  price?: number | null
  status?: string
  created_at?: string
  updated_at?: string
  helper_profile?: {
    id?: number
    city?: string
    state?: string
    address?: string
    zip_code?: string
    phone?: string
    user?: { id?: number; name?: string; email?: string }
    photos?: unknown[]
    about?: string
    created_at?: string
    updated_at?: string
  }
}

// Helper function to calculate age from birthday
export const calculateAge = (birthday: string): number => {
  const today = new Date()
  const birthDate = new Date(birthday)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// Helper function to check if a pet type supports a capability
export const petSupportsCapability = (petType: PetType, capability: string): boolean => {
  // For placement capability, use the database-driven field
  if (capability === 'placement') {
    return petType.placement_requests_allowed
  }

  // Weight capability: DB-driven flag
  if (capability === 'weight') {
    return Boolean(petType.weight_tracking_allowed)
  }
  // Microchips capability: DB-driven flag
  if (capability === 'microchips') {
    return Boolean(petType.microchips_allowed)
  }
  // Medical capability: static for now (cats supported). Backend enforces this too.
  if (capability === 'medical') {
    return petType.slug.toLowerCase() === 'cat'
  }
  // Vaccinations capability: static for now (cats supported). Backend enforces this too.
  if (capability === 'vaccinations') {
    return petType.slug.toLowerCase() === 'cat'
  }
  // All other capabilities (ownership, comments, status_update, photos) are allowed for all pet types
  return true
}
