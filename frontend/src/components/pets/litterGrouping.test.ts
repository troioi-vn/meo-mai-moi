import { describe, it, expect } from 'vite-plus/test'
import { groupPetsByLitter, isLitterGroup } from './litterGrouping'
import type { Pet } from '@/types/pet'

const mockCatType = {
  id: 1,
  name: 'Cat',
  slug: 'cat',
  description: null,
  is_active: true,
  is_system: true,
  display_order: 1,
  placement_requests_allowed: true,
}

function makePet(overrides: Partial<Pet> & { id: number; name: string }): Pet {
  return {
    birthday: '2020-01-01',
    country: 'VN',
    city: 'Hanoi',
    description: 'desc',
    user_id: 1,
    pet_type_id: 1,
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    pet_type: mockCatType,
    ...overrides,
  }
}

describe('groupPetsByLitter', () => {
  it('groups pets with same litter_id into one card', () => {
    const pets = [
      makePet({ id: 1, name: 'A', litter_id: 10, litter: { id: 10, name: 'Spring Litter' } }),
      makePet({ id: 2, name: 'B', litter_id: 10, litter: { id: 10, name: 'Spring Litter' } }),
      makePet({ id: 3, name: 'C', litter_id: 10, litter: { id: 10, name: 'Spring Litter' } }),
    ]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('litter')
    const firstGroup = result[0]!
    if (isLitterGroup(firstGroup)) {
      expect(firstGroup.litterId).toBe(10)
      expect(firstGroup.litterName).toBe('Spring Litter')
      expect(firstGroup.members).toHaveLength(3)
    }
  })

  it('keeps solo pets as individual items', () => {
    const pets = [
      makePet({ id: 1, name: 'Solo', litter_id: null }),
      makePet({ id: 2, name: 'A', litter_id: 10, litter: { id: 10, name: 'Litter X' } }),
      makePet({ id: 3, name: 'B', litter_id: 10, litter: { id: 10, name: 'Litter X' } }),
    ]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(2)
    // Solo first, then litter
    expect(result[0]!.type).toBe('pet')
    expect(result[1]!.type).toBe('litter')
  })

  it('does not group pets with no litter_id', () => {
    const pets = [makePet({ id: 1, name: 'A' }), makePet({ id: 2, name: 'B' })]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.type === 'pet')).toBe(true)
  })

  it('handles different litters separately', () => {
    const pets = [
      makePet({ id: 1, name: 'A', litter_id: 10, litter: { id: 10, name: 'Litter 10' } }),
      makePet({ id: 2, name: 'B', litter_id: 11, litter: { id: 11, name: 'Litter 11' } }),
      makePet({ id: 3, name: 'C', litter_id: 10, litter: { id: 10, name: 'Litter 10' } }),
    ]
    const result = groupPetsByLitter(pets)
    // Should be 2 groups, first appearance order: Litter 10 then Litter 11
    expect(result).toHaveLength(2)
    expect(result[0]!.type).toBe('litter')
    expect(result[1]!.type).toBe('litter')
    const firstLitter = result[0]!
    const secondLitter = result[1]!
    if (isLitterGroup(firstLitter) && isLitterGroup(secondLitter)) {
      expect(firstLitter.litterId).toBe(10)
      expect(firstLitter.members).toHaveLength(2)
      expect(secondLitter.litterId).toBe(11)
      expect(secondLitter.members).toHaveLength(1)
    }
  })

  it('preserves interleaving order based on first occurrence', () => {
    const pets = [
      makePet({ id: 1, name: 'Solo1', litter_id: null }),
      makePet({ id: 2, name: 'A', litter_id: 10, litter: { id: 10, name: 'L' } }),
      makePet({ id: 3, name: 'Solo2', litter_id: null }),
      makePet({ id: 4, name: 'B', litter_id: 10, litter: { id: 10, name: 'L' } }),
    ]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(3)
    expect(result[0]!.type).toBe('pet')
    if (!isLitterGroup(result[0]!)) expect(result[0]!.pet.id).toBe(1)
    expect(result[1]!.type).toBe('litter')
    expect(result[2]!.type).toBe('pet')
    if (!isLitterGroup(result[2]!)) expect(result[2]!.pet.id).toBe(3)
  })

  it('member count reflects visible members only (filter simulation)', () => {
    // Simulate filtered list where only 2 of 5 litter members survive
    const filtered = [
      makePet({ id: 1, name: 'A', litter_id: 10, litter: { id: 10, name: 'Big Litter' } }),
      makePet({ id: 2, name: 'B', litter_id: 10, litter: { id: 10, name: 'Big Litter' } }),
      makePet({ id: 3, name: 'Solo', litter_id: null }),
    ]
    const result = groupPetsByLitter(filtered)
    expect(result).toHaveLength(2)
    const visibleGroup = result[0]!
    if (isLitterGroup(visibleGroup)) {
      expect(visibleGroup.members).toHaveLength(2)
    }
  })

  it('no card when litter has no visible members (empty input for that litter)', () => {
    const pets = [makePet({ id: 1, name: 'Solo', litter_id: null })]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(1)
    expect(result[0]!.type).toBe('pet')
  })

  it('falls back to Litter #id when name missing', () => {
    const pets = [
      makePet({ id: 1, name: 'A', litter_id: 99, litter: null }),
      makePet({ id: 2, name: 'B', litter_id: 99, litter: null }),
    ]
    const result = groupPetsByLitter(pets)
    expect(result[0]!.type).toBe('litter')
    const fallbackGroup = result[0]!
    if (isLitterGroup(fallbackGroup)) {
      expect(fallbackGroup.litterName).toBe('Litter #99')
    }
  })

  it('takes the litter urgency from its most urgent member, not its last one', () => {
    // The urgent member is FIRST here on purpose. A rule that reads the last
    // member's status instead of the minimum would rank this litter as calm and
    // sort it behind the solo pet, so this case fails if the min is not taken.
    const urgentFirst = makePet({
      id: 1,
      name: 'Urgent',
      litter_id: 10,
      litter: { id: 10, name: 'Litter A' },
      health_summary: { vaccination_status: 'overdue' },
    } as unknown as Pet)
    const calmLast = makePet({
      id: 2,
      name: 'Calm',
      litter_id: 10,
      litter: { id: 10, name: 'Litter A' },
      health_summary: { vaccination_status: 'up_to_date' },
    } as unknown as Pet)
    const soloDueSoon = makePet({
      id: 3,
      name: 'Solo',
      health_summary: { vaccination_status: 'due_soon' },
    } as unknown as Pet)

    const result = groupPetsByLitter([urgentFirst, calmLast, soloDueSoon], {
      sortBy: 'vaccination_due',
      sortDirection: 'asc',
    })

    expect(result).toHaveLength(2)
    expect(result[0]!.type).toBe('litter')
    expect(result[1]!.type).toBe('pet')
  })

  it('sorts by most urgent member under vaccination_due asc', () => {
    const overdue = makePet({
      id: 1,
      name: 'A',
      litter_id: 10,
      litter: { id: 10, name: 'Litter A' },
      health_summary: { vaccination_status: 'up_to_date' },
    } as unknown as Pet)
    const dueSoon = makePet({
      id: 2,
      name: 'B',
      litter_id: 10,
      litter: { id: 10, name: 'Litter A' },
      health_summary: { vaccination_status: 'overdue' },
    } as unknown as Pet)
    const soloOverdue = makePet({
      id: 3,
      name: 'Solo',
      health_summary: { vaccination_status: 'due_soon' },
    } as unknown as Pet)
    const soloUnknown = makePet({
      id: 4,
      name: 'Solo2',
      health_summary: { vaccination_status: 'unknown' },
    } as unknown as Pet)
    // Input order: Litter A (mixed up_to_date + overdue), solo due_soon, solo unknown
    // Litter urgency = overdue (0), solo due_soon = 1, solo unknown = 3
    // Sorted asc should be: Litter A (0), solo due_soon (1), solo unknown (3)
    const pets = [overdue, dueSoon, soloOverdue, soloUnknown]
    const result = groupPetsByLitter(pets, { sortBy: 'vaccination_due', sortDirection: 'asc' })
    expect(result).toHaveLength(3)
    expect(result[0]!.type).toBe('litter')
    const urgentGroup = result[0]!
    if (isLitterGroup(urgentGroup)) expect(urgentGroup.litterId).toBe(10)
    expect(result[1]!.type).toBe('pet')
    if (!isLitterGroup(result[1]!)) expect(result[1]!.pet.id).toBe(3)
    expect(result[2]!.type).toBe('pet')
    if (!isLitterGroup(result[2]!)) expect(result[2]!.pet.id).toBe(4)
  })

  it('litter with overdue hides not behind calm one when sorted desc', () => {
    const calmLitter = [
      makePet({
        id: 1,
        name: 'A',
        litter_id: 10,
        litter: { id: 10, name: 'Calm' },
        health_summary: { vaccination_status: 'up_to_date' },
      } as unknown as Pet),
      makePet({
        id: 2,
        name: 'B',
        litter_id: 10,
        litter: { id: 10, name: 'Calm' },
        health_summary: { vaccination_status: 'up_to_date' },
      } as unknown as Pet),
    ]
    const urgentSolo = makePet({
      id: 3,
      name: 'Urgent',
      health_summary: { vaccination_status: 'overdue' },
    } as unknown as Pet)
    const result = groupPetsByLitter([...calmLitter, urgentSolo], {
      sortBy: 'vaccination_due',
      sortDirection: 'asc',
    })
    // urgent solo should come before calm litter? No, calm litter rank 2, urgent solo 0 => urgent first
    expect(result[0]!.type).toBe('pet')
    if (!isLitterGroup(result[0]!)) expect(result[0]!.pet.id).toBe(3)
    // But if litter had one overdue member, it should sort as overdue
    const mixedLitter = [
      makePet({
        id: 4,
        name: 'C',
        litter_id: 11,
        litter: { id: 11, name: 'Mixed' },
        health_summary: { vaccination_status: 'up_to_date' },
      } as unknown as Pet),
      makePet({
        id: 5,
        name: 'D',
        litter_id: 11,
        litter: { id: 11, name: 'Mixed' },
        health_summary: { vaccination_status: 'overdue' },
      } as unknown as Pet),
    ]
    const result2 = groupPetsByLitter([...calmLitter, ...mixedLitter], {
      sortBy: 'vaccination_due',
      sortDirection: 'asc',
    })
    // Mixed litter rank 0, calm litter rank 2 => mixed first
    expect(result2[0]!.type).toBe('litter')
    const mixedGroup = result2[0]!
    if (isLitterGroup(mixedGroup)) expect(mixedGroup.litterId).toBe(11)
  })

  it('does not sort for non-vaccination keys (preserves input order)', () => {
    const pets = [
      makePet({ id: 2, name: 'B', litter_id: 10, litter: { id: 10, name: 'L' } }),
      makePet({ id: 1, name: 'A', litter_id: null }),
    ]
    const result = groupPetsByLitter(pets, { sortBy: 'name', sortDirection: 'asc' })
    // Should preserve input order: litter first, then solo
    expect(result[0]!.type).toBe('litter')
    expect(result[1]!.type).toBe('pet')
  })

  it('pets without litter_id are unaffected (invisible to grouping)', () => {
    const pets = [
      makePet({ id: 1, name: 'Solo1' }),
      makePet({ id: 2, name: 'Solo2' }),
      makePet({ id: 3, name: 'Solo3' }),
    ]
    const result = groupPetsByLitter(pets)
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.type === 'pet')).toBe(true)
  })
})
