import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { renderHook, act } from '@testing-library/react'
import {
  applyPetFilter,
  applyRelationshipFilter,
  usePetFilter,
  type PetFilterState,
} from './use-pet-filter'
import type { Pet } from '@/types/pet'

// Helper to create a partial Pet for testing
const createPet = (overrides: Partial<Pet>): Pet =>
  ({
    id: 1,
    name: 'Test',
    pet_type_id: 1,
    pet_type: { id: 1, name: 'Cat', display_order: 1 },
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }) as Pet

describe('use-pet-filter logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T09:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const catPet = createPet({
    id: 1,
    name: 'Alice',
    pet_type_id: 1,
    created_at: '2024-01-01T00:00:00Z',
  })
  const dogPet = createPet({
    id: 2,
    name: 'Bob',
    pet_type_id: 2,
    created_at: '2024-01-02T00:00:00Z',
  })
  const oldPet = createPet({
    id: 3,
    name: 'Charlie',
    pet_type_id: 1,
    birthday: '2020-01-01',
    birthday_precision: 'day',
  })
  const youngPet = createPet({
    id: 4,
    name: 'Dave',
    pet_type_id: 1,
    birthday: '2023-01-01',
    birthday_precision: 'day',
  })
  const soonBirthdayPet = createPet({
    id: 5,
    name: 'Eve',
    pet_type_id: 1,
    birthday: '2015-03-12',
    birthday_precision: 'day',
  })
  const laterBirthdayPet = createPet({
    id: 6,
    name: 'Frank',
    pet_type_id: 1,
    birthday: '2010-03-20',
    birthday_precision: 'day',
  })

  const pets = [catPet, dogPet, oldPet, youngPet, soonBirthdayPet, laterBirthdayPet]

  describe('applyPetFilter', () => {
    it('filters by petTypeIds', () => {
      const filter: PetFilterState = {
        petTypeIds: [2],
        relationships: [],
        sortBy: 'name',
        sortDirection: 'asc',
      }
      const result = applyPetFilter(pets, filter)
      const firstPet = result[0]
      expect(result).toHaveLength(1)
      expect(firstPet).toBeDefined()
      if (!firstPet) throw new Error('Expected filtered pet')
      expect(firstPet.id).toBe(2)
    })

    it('sorts by name', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'name',
        sortDirection: 'asc',
      }
      const result = applyPetFilter([catPet, dogPet], filter)
      const firstPet = result[0]
      const secondPet = result[1]
      expect(firstPet).toBeDefined()
      expect(secondPet).toBeDefined()
      if (!firstPet || !secondPet) throw new Error('Expected sorted pets')
      expect(firstPet.name).toBe('Alice')
      expect(secondPet.name).toBe('Bob')

      const resultDesc = applyPetFilter([catPet, dogPet], { ...filter, sortDirection: 'desc' })
      const firstDescPet = resultDesc[0]
      const secondDescPet = resultDesc[1]
      expect(firstDescPet).toBeDefined()
      expect(secondDescPet).toBeDefined()
      if (!firstDescPet || !secondDescPet) throw new Error('Expected descending pets')
      expect(firstDescPet.name).toBe('Bob')
      expect(secondDescPet.name).toBe('Alice')
    })

    it('sorts by age (youngest first for asc)', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'age',
        sortDirection: 'asc',
      }
      const result = applyPetFilter([oldPet, youngPet], filter)
      const firstPet = result[0]
      const secondPet = result[1]
      expect(firstPet).toBeDefined()
      expect(secondPet).toBeDefined()
      if (!firstPet || !secondPet) throw new Error('Expected age-sorted pets')
      expect(firstPet.id).toBe(4) // Dave (2023) is younger than Charlie (2020)
      expect(secondPet.id).toBe(3)
    })

    it('sorts by birthday by next upcoming birthday, ignoring age', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'birthday',
        sortDirection: 'asc',
      }
      const result = applyPetFilter([oldPet, youngPet, laterBirthdayPet, soonBirthdayPet], filter)
      expect(result.map((pet) => pet.id)).toEqual([5, 6, 3, 4])
    })

    it('sorts birthday desc by farthest next birthday first', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'birthday',
        sortDirection: 'desc',
      }
      const result = applyPetFilter([oldPet, youngPet, laterBirthdayPet, soonBirthdayPet], filter)
      expect(result.map((pet) => pet.id)).toEqual([3, 4, 6, 5])
    })

    it('sorts by created_at', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'created_at',
        sortDirection: 'asc',
      }
      const result = applyPetFilter([catPet, dogPet], filter)
      const firstPet = result[0]
      const secondPet = result[1]
      expect(firstPet).toBeDefined()
      expect(secondPet).toBeDefined()
      if (!firstPet || !secondPet) throw new Error('Expected created-at-sorted pets')
      expect(firstPet.id).toBe(1)
      expect(secondPet.id).toBe(2)
    })
  })

  describe('applyRelationshipFilter', () => {
    const ownerPet = createPet({
      id: 1,
      viewer_permissions: { is_owner: true, is_editor: true, is_viewer: true },
    })
    const editorPet = createPet({
      id: 2,
      viewer_permissions: { is_owner: false, is_editor: true, is_viewer: true },
    })
    const viewerPet = createPet({
      id: 3,
      viewer_permissions: { is_owner: false, is_editor: false, is_viewer: true },
    })

    it('returns all pets when no relationship filter is active', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: [],
        sortBy: 'name',
        sortDirection: 'asc',
      }
      expect(applyRelationshipFilter([ownerPet, editorPet], filter, 'owned')).toHaveLength(2)
    })

    it('filters owned section by relationship type', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: ['owner'],
        sortBy: 'name',
        sortDirection: 'asc',
      }
      const result = applyRelationshipFilter([ownerPet, editorPet, viewerPet], filter, 'owned')
      const firstPet = result[0]
      expect(result).toHaveLength(1)
      expect(firstPet).toBeDefined()
      if (!firstPet) throw new Error('Expected owned pet')
      expect(firstPet.id).toBe(1)

      const filterEditor: PetFilterState = { ...filter, relationships: ['editor'] }
      const resEditor = applyRelationshipFilter(
        [ownerPet, editorPet, viewerPet],
        filterEditor,
        'owned'
      )
      expect(resEditor).toHaveLength(2)
      expect(resEditor.map((p) => p.id)).toContain(1)
      expect(resEditor.map((p) => p.id)).toContain(2)
    })

    it('filters fostering section correctly', () => {
      const filter: PetFilterState = {
        petTypeIds: [],
        relationships: ['foster'],
        sortBy: 'name',
        sortDirection: 'asc',
      }
      const pets = [createPet({ id: 1 })]
      expect(applyRelationshipFilter(pets, filter, 'fostering')).toHaveLength(1)

      const filterOther: PetFilterState = { ...filter, relationships: ['owner'] }
      expect(applyRelationshipFilter(pets, filterOther, 'fostering')).toHaveLength(0)
    })
  })
})

describe('usePetFilter hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => usePetFilter())
    expect(result.current.filter.sortBy).toBe('created_at')
    expect(result.current.isActive).toBe(false)
  })

  it('updates filter and persists to localStorage', () => {
    const { result } = renderHook(() => usePetFilter())

    act(() => {
      result.current.updateFilter({ sortBy: 'name' })
    })

    expect(result.current.filter.sortBy).toBe('name')
    expect(result.current.isActive).toBe(true)

    const stored = JSON.parse(localStorage.getItem('my-pets-filter') || '{}')
    expect(stored.sortBy).toBe('name')
  })

  it('resets filter', () => {
    const { result } = renderHook(() => usePetFilter())

    act(() => {
      result.current.updateFilter({ sortBy: 'name' })
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.resetFilter()
    })

    expect(result.current.filter.sortBy).toBe('created_at')
    expect(result.current.isActive).toBe(false)
  })
})
