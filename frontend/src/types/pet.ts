import type { PetSex } from '@/api/generated/model/petSex'
import type { PetBirthdayPrecision } from '@/api/generated/model/petBirthdayPrecision'
import type { City } from '@/api/generated/model/city'

export type { City }

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

export interface Category {
  id: number
  name: string
  slug: string
  pet_type_id: number
  description?: string | null
  created_by?: number | null
  approved_at?: string | null
  usage_count: number
  created_at: string
  updated_at: string
  pet_type?: PetType
}

export interface PetPhoto {
  id: number
  url: string
  thumb_url: string | null
  is_primary: boolean
}

export interface PetRelationship {
  id: number
  user_id: number
  pet_id: number
  relationship_type: 'owner' | 'foster' | 'editor' | 'viewer'
  start_at: string
  end_at: string | null
  created_by: number
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
    email?: string
  }
}

export interface Pet {
  id: number
  name: string
  sex?: PetSex
  birthday: string | null // Exact ISO date when precision=day; nullable otherwise
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
  birthday_precision?: PetBirthdayPrecision
  country: string // ISO 3166-1 alpha-2 code
  state?: string | null
  city_id?: number | null
  city?: City | string | null
  address?: string | null
  description: string
  user_id: number
  pet_type_id: number
  status: 'active' | 'lost' | 'deceased' | 'deleted'
  imageUrl?: string
  photo_url?: string // Backend API photo URL
  photo?: { id: number; url: string } | null
  photos?: PetPhoto[] // All photos for gallery
  created_at: string
  updated_at: string
  pet_type: PetType
  categories?: Category[]
  user: {
    id: number
    name: string
    email: string
  }
  viewer_permissions?: {
    can_edit?: boolean
    can_view_contact?: boolean
    can_delete?: boolean
    is_owner?: boolean
    is_viewer?: boolean
  }
  placement_requests?: PlacementRequest[]
  relationships?: PetRelationship[]
  // Convenience flag from backend (optional) used by PetCard
  placement_request_active?: boolean
}

// Re-export placement types for convenience
export type {
  PlacementRequestResponse,
  PlacementResponseStatus,
  PlacementRequestStatus,
  PlacementRequestType,
  TransferRequestStatus,
  TransferRequest,
} from './placement'
export {
  formatRequestType,
  formatStatus,
  isFosteringType,
  isTemporaryType,
  requiresHandover,
  PlacementRequestStatusLabels,
  PlacementResponseStatusLabels,
  PlacementRequestTypeLabels,
} from './placement'

import type { PlacementRequestResponse } from './placement'
import type { TransferRequest } from './placement'

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
  // New: responses from helpers
  responses?: PlacementRequestResponse[]
  // New: up to 2 transfer requests (handover/return)
  transfer_requests?: TransferRequest[]
  pet?: Pet
  created_at?: string
  updated_at?: string
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

// Helper to calculate years, months, and days between two dates
const calculateAgeComponents = (
  birthday: Date,
  today: Date
): { years: number; months: number; days: number } => {
  let years = today.getFullYear() - birthday.getFullYear()
  let months = today.getMonth() - birthday.getMonth()
  let days = today.getDate() - birthday.getDate()

  if (days < 0) {
    months--
    // Get days in previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    days += prevMonth.getDate()
  }

  if (months < 0) {
    years--
    months += 12
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) }
}

// Returns a human friendly age/approximation string based on precision fields
export const formatPetAge = (
  pet: Pick<
    Pet,
    'birthday' | 'birthday_precision' | 'birthday_year' | 'birthday_month' | 'birthday_day'
  >,
  t: (key: string, options?: any) => string
): string => {
  const precision = pet.birthday_precision ?? (pet.birthday ? 'day' : 'unknown')
  const today = new Date()
  switch (precision) {
    case 'day':
      if (pet.birthday) {
        const birthDate = new Date(pet.birthday)
        if (Number.isNaN(birthDate.getTime())) return t('pets:age.unknown')
        const { years, months, days } = calculateAgeComponents(birthDate, today)

        // More than 1 year old
        if (years > 0) {
          const yearStr = t('pets:age.year', { count: years })
          // Show months only if there's at least 1 month
          if (months > 0) {
            const monthStr = t('pets:age.month', { count: months })
            return `${yearStr} ${monthStr}`
          }
          return yearStr
        }

        // Less than 1 year but at least 1 month
        if (months > 0) {
          return t('pets:age.month', { count: months })
        }

        // Less than 1 month
        return t('pets:age.day', { count: days })
      }
      return t('pets:age.unknown')
    case 'month': {
      if (!pet.birthday_year || !pet.birthday_month) return t('pets:age.unknown')
      const years =
        today.getFullYear() -
        pet.birthday_year -
        (today.getMonth() + 1 < pet.birthday_month ? 1 : 0)
      if (years <= 0) {
        // Show months old if less than a year
        const monthsDiff =
          (today.getFullYear() - pet.birthday_year) * 12 +
          (today.getMonth() + 1 - pet.birthday_month)
        const text = t('pets:age.month', { count: monthsDiff })
        return t('pets:age.approx', { text })
      }
      const text = t('pets:age.year', { count: years })
      return t('pets:age.approxSymbol', { text })
    }
    case 'year': {
      if (!pet.birthday_year) return t('pets:age.unknown')
      const years = today.getFullYear() - pet.birthday_year
      if (years <= 0) {
        return t('pets:age.lessThanYearApprox')
      }
      const text = t('pets:age.year', { count: years })
      return t('pets:age.approxSymbol', { text })
    }
    case 'unknown':
    default:
      return t('pets:age.unknown')
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
