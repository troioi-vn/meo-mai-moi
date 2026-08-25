import type { Pet } from '@/types/pet'
import type { SortBy, SortDirection } from '@/hooks/use-pet-filter'
import i18n from '@/i18n'

export interface LitterGroup {
  type: 'litter'
  litterId: number
  litterName: string
  members: Pet[]
}

export interface PetItem {
  type: 'pet'
  pet: Pet
}

export type PetOrLitter = PetItem | LitterGroup

export function isLitterGroup(item: PetOrLitter): item is LitterGroup {
  return item.type === 'litter'
}

/**
 * Map vaccination_status to urgency rank.
 * Lower = more urgent. Used for vaccination_due sorting.
 */
export function getVaccinationUrgencyRank(pet: Pet): number {
  const status = pet.health_summary?.vaccination_status
  switch (status) {
    case 'overdue':
      return 0
    case 'due_soon':
      return 1
    case 'up_to_date':
      return 2
    case 'unknown':
    default:
      return 3
  }
}

function getLitterUrgencyRank(members: Pet[]): number {
  let min = Infinity
  for (const m of members) {
    const r = getVaccinationUrgencyRank(m)
    if (r < min) min = r
  }
  return min === Infinity ? 3 : min
}

/**
 * Group pets by litter_id. Solo pets remain individual.
 * When sortBy is 'vaccination_due', litters and pets are sorted by most urgent vaccination status.
 * For other sort keys, preserve input order (already sorted by applyPetFilter).
 */
export function groupPetsByLitter(
  pets: Pet[],
  options?: { sortBy?: SortBy; sortDirection?: SortDirection }
): PetOrLitter[] {
  const litterMap = new Map<number, Pet[]>()
  const litterNameMap = new Map<number, string>()
  // To preserve order of first appearance, track insertion order
  const litterOrder: number[] = []

  for (const pet of pets) {
    const litterId = pet.litter_id
    if (litterId != null) {
      if (!litterMap.has(litterId)) {
        litterMap.set(litterId, [])
        litterOrder.push(litterId)
        const name = pet.litter?.name
        if (name) litterNameMap.set(litterId, name)
      }
      if (pet.litter?.name) {
        litterNameMap.set(litterId, pet.litter.name)
      }
      litterMap.get(litterId)?.push(pet)
    }
  }

  const result: PetOrLitter[] = []
  // Build groups preserving original interleaving based on first occurrence in input
  // Instead of separate collections, walk input order and emit group at first encounter
  const emittedLitters = new Set<number>()
  const litterGroups = new Map<number, LitterGroup>()

  for (const id of litterOrder) {
    const members = litterMap.get(id) ?? []
    const name = litterNameMap.get(id) ?? i18n.t('pets:litter.fallbackName', { id })
    litterGroups.set(id, {
      type: 'litter',
      litterId: id,
      litterName: name,
      members,
    })
  }

  // Walk pets in input order to interleave
  for (const pet of pets) {
    const lid = pet.litter_id
    if (lid != null) {
      if (!emittedLitters.has(lid)) {
        emittedLitters.add(lid)
        const group = litterGroups.get(lid)
        if (group) result.push(group)
      }
    } else {
      result.push({ type: 'pet', pet })
    }
  }

  // For vaccination_due, sort by urgency
  if (options?.sortBy === 'vaccination_due') {
    const dir = options.sortDirection === 'asc' ? 1 : -1
    result.sort((a, b) => {
      const aRank =
        a.type === 'litter' ? getLitterUrgencyRank(a.members) : getVaccinationUrgencyRank(a.pet)
      const bRank =
        b.type === 'litter' ? getLitterUrgencyRank(b.members) : getVaccinationUrgencyRank(b.pet)
      if (aRank === bRank) return 0
      return (aRank - bRank) * dir
    })
  }

  return result
}
