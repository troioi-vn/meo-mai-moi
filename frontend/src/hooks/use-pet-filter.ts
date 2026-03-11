import { useState, useEffect, useCallback } from 'react'
import type { Pet } from '@/types/pet'

export type SortBy = 'created_at' | 'age' | 'name' | 'birthday' | 'vaccination_due'
export type SortDirection = 'asc' | 'desc'
export type RelationshipFilter = 'owner' | 'foster' | 'editor' | 'viewer'

export interface PetFilterState {
  petTypeIds: number[]
  relationships: RelationshipFilter[]
  sortBy: SortBy
  sortDirection: SortDirection
}

const STORAGE_KEY = 'my-pets-filter'

const DEFAULT_FILTER: PetFilterState = {
  petTypeIds: [],
  relationships: [],
  sortBy: 'created_at',
  sortDirection: 'desc',
}

function loadFromStorage(): PetFilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FILTER
    const parsed = JSON.parse(raw) as Partial<PetFilterState>
    return { ...DEFAULT_FILTER, ...parsed }
  } catch {
    return DEFAULT_FILTER
  }
}

/** Returns a timestamp (ms) representing the pet's birthday, or Infinity if unknown. */
function getBirthdayTimestamp(pet: Pet): number {
  const precision = pet.birthday_precision ?? (pet.birthday ? 'day' : 'unknown')
  switch (precision) {
    case 'day': {
      if (pet.birthday) {
        const t = new Date(pet.birthday).getTime()
        return isNaN(t) ? Infinity : t
      }
      return Infinity
    }
    case 'month': {
      if (pet.birthday_year && pet.birthday_month) {
        return new Date(pet.birthday_year, pet.birthday_month - 1, 1).getTime()
      }
      return Infinity
    }
    case 'year': {
      if (pet.birthday_year) {
        return new Date(pet.birthday_year, 0, 1).getTime()
      }
      return Infinity
    }
    default:
      return Infinity
  }
}

/** Returns the distance in ms until the pet's next birthday, or Infinity if unknown. */
function getNextBirthdayDistance(pet: Pet, referenceDate = new Date()): number {
  const precision = pet.birthday_precision ?? (pet.birthday ? 'day' : 'unknown')

  let month: number | null = null
  let day: number | null = null

  switch (precision) {
    case 'day': {
      if (!pet.birthday) return Infinity
      const birthDate = new Date(pet.birthday)
      if (Number.isNaN(birthDate.getTime())) return Infinity
      month = birthDate.getMonth()
      day = birthDate.getDate()
      break
    }
    case 'month': {
      if (!pet.birthday_month) return Infinity
      month = pet.birthday_month - 1
      day = 1
      break
    }
    case 'year':
    case 'unknown':
    default:
      return Infinity
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  let nextBirthday = new Date(today.getFullYear(), month, day)

  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month, day)
  }

  return nextBirthday.getTime() - today.getTime()
}

/** Apply pet-type filter + sort. Relationship filtering is handled at the section level in the page. */
export function applyPetFilter(pets: Pet[], filter: PetFilterState): Pet[] {
  let result = [...pets]

  if (filter.petTypeIds.length > 0) {
    result = result.filter((p) => filter.petTypeIds.includes(p.pet_type_id))
  }

  const dir = filter.sortDirection === 'asc' ? 1 : -1

  result.sort((a, b) => {
    switch (filter.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name) * dir

      case 'age': {
        const aB = getBirthdayTimestamp(a)
        const bB = getBirthdayTimestamp(b)
        if (aB === Infinity && bB === Infinity) return 0
        if (aB === Infinity) return 1
        if (bB === Infinity) return -1
        // Higher timestamp = more recently born = younger; asc = youngest first
        return (bB - aB) * dir
      }

      case 'birthday': {
        const aB = getNextBirthdayDistance(a)
        const bB = getNextBirthdayDistance(b)
        if (aB === Infinity && bB === Infinity) return 0
        if (aB === Infinity) return 1
        if (bB === Infinity) return -1
        // asc = closest upcoming birthday first, independent of birth year
        return (aB - bB) * dir
      }

      case 'created_at': {
        const aD = new Date(a.created_at).getTime()
        const bD = new Date(b.created_at).getTime()
        return (aD - bD) * dir
      }

      case 'vaccination_due':
        // TODO: Vaccination data is not currently included in the pet list response from the backend.
        // Once added, implement sorting by next due date here.
        return 0

      default:
        return 0
    }
  })

  return result
}

/**
 * Given the relationship filter selection, decide whether a specific section
 * should be visible, and which pets within it to include.
 *
 * Mapping:
 *  'owner'  → owned + transferred_away sections
 *  'foster' → fostering_active + fostering_past sections
 *  'editor' → owned section, only pets where viewer_permissions.is_editor
 *  'viewer' → owned section, only pets where viewer_permissions.is_viewer
 */
export function applyRelationshipFilter(
  pets: Pet[],
  filter: PetFilterState,
  sectionType: 'owned' | 'fostering' | 'transferred'
): Pet[] {
  if (filter.relationships.length === 0) return pets

  const has = (r: RelationshipFilter) => filter.relationships.includes(r)

  switch (sectionType) {
    case 'fostering':
      // Show fostering sections only when 'foster' is selected
      return has('foster') ? pets : []

    case 'transferred':
      // Transferred pets belong to the ownership history; show with 'owner'
      return has('owner') ? pets : []

    case 'owned': {
      // 'owner' selected: include all owned pets (is_owner is presumably true for all)
      // 'editor'/'viewer' selected: filter by viewer_permissions
      // Multiple types: union
      return pets.filter((pet) => {
        const perms = pet.viewer_permissions
        if (has('owner') && perms?.is_owner !== false) return true
        if (has('editor') && perms?.is_editor === true) return true
        if (has('viewer') && perms?.is_viewer === true) return true
        return false
      })
    }
  }
}

export function isFilterActive(filter: PetFilterState): boolean {
  return (
    filter.petTypeIds.length > 0 ||
    filter.relationships.length > 0 ||
    filter.sortBy !== DEFAULT_FILTER.sortBy ||
    filter.sortDirection !== DEFAULT_FILTER.sortDirection
  )
}

export function usePetFilter() {
  const [filter, setFilter] = useState<PetFilterState>(loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filter))
    } catch {
      // ignore storage errors
    }
  }, [filter])

  const updateFilter = useCallback((updates: Partial<PetFilterState>) => {
    setFilter((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER)
  }, [])

  return {
    filter,
    updateFilter,
    resetFilter,
    isActive: isFilterActive(filter),
  }
}
