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

export type BirthdayPrecision = 'day' | 'month' | 'year' | 'unknown'

export interface Pet {
  id: number
  name: string
  breed: string
  birthday: string | null // Exact ISO date when precision=day; nullable otherwise
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
  birthday_precision?: BirthdayPrecision
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
  if (!birthday) return 0
  const today = new Date()
  const birthDate = new Date(birthday)
  if (Number.isNaN(birthDate.getTime())) return 0
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age < 0 ? 0 : age
}

// Returns a human friendly age/approximation string based on precision fields
export const formatPetAge = (pet: Pick<Pet, 'birthday' | 'birthday_precision' | 'birthday_year' | 'birthday_month' | 'birthday_day'>): string => {
  const precision = pet.birthday_precision || (pet.birthday ? 'day' : 'unknown')
  const today = new Date()
  switch (precision) {
    case 'day':
      if (pet.birthday) {
        const years = calculateAge(pet.birthday)
        return years === 1 ? '1 year old' : `${years} years old`
      }
      return 'Age unknown'
    case 'month': {
      if (!pet.birthday_year || !pet.birthday_month) return 'Age unknown'
      const years = today.getFullYear() - pet.birthday_year - (today.getMonth() + 1 < pet.birthday_month ? 1 : 0)
      if (years <= 0) {
        // Show months old if less than a year
        const monthsDiff = (today.getFullYear() - pet.birthday_year) * 12 + (today.getMonth() + 1 - pet.birthday_month)
        return monthsDiff <= 1 ? '1 month old (approx)' : `${monthsDiff} months old (approx)`
      }
      return years === 1 ? '≈1 year old' : `≈${years} years old`
    }
    case 'year': {
      if (!pet.birthday_year) return 'Age unknown'
      const years = today.getFullYear() - pet.birthday_year
      return years <= 0 ? 'Less than 1 year (approx)' : (years === 1 ? '≈1 year old' : `≈${years} years old`)
    }
    case 'unknown':
    default:
      return 'Age unknown'
  }
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
