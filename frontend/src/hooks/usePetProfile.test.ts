import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePetProfile } from './usePetProfile'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { Pet } from '@/types/pet'

describe('usePetProfile', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  describe('when id is missing', () => {
    it('sets error and stops loading', async () => {
      const { result } = renderHook(() => usePetProfile(undefined))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('No pet ID provided')
      expect(result.current.pet).toBeNull()
    })
  })

  describe('successful fetch', () => {
    it('loads pet data and sets state', async () => {
      const mockPet: Pet = {
        id: 123,
        name: 'Fluffy',
        pet_type: {
          id: 1,
          name: 'Cat',
          slug: 'cat',
          is_active: true,
          is_system: false,
          display_order: 1,
          placement_requests_allowed: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        // Add other required fields as needed
      } as Pet

      server.use(
        http.get('http://localhost:3000/api/pets/123', () => {
          return HttpResponse.json({ data: mockPet })
        })
      )

      const { result } = renderHook(() => usePetProfile('123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pet).toEqual(mockPet)
      expect(result.current.error).toBeNull()
    })
  })

  describe('404 error', () => {
    it('sets "Pet not found" error', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/123', () => {
          return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        })
      )

      const { result } = renderHook(() => usePetProfile('123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Pet not found')
      expect(result.current.pet).toBeNull()
    })
  })

  describe('other errors', () => {
    it('sets generic error message', async () => {
      server.use(
        http.get('http://localhost:3000/api/pets/123', () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => usePetProfile('123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load pet information')
      expect(result.current.pet).toBeNull()
    })
  })

  describe('refresh', () => {
    it('refetches and updates state', async () => {
      const initialPet: Pet = {
        id: 123,
        name: 'Fluffy',
        pet_type: {
          id: 1,
          name: 'Cat',
          slug: 'cat',
          is_active: true,
          is_system: false,
          display_order: 1,
          placement_requests_allowed: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      } as Pet

      const updatedPet: Pet = {
        id: 123,
        name: 'Fluffy Updated',
        pet_type: {
          id: 1,
          name: 'Cat',
          slug: 'cat',
          is_active: true,
          is_system: false,
          display_order: 1,
          placement_requests_allowed: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      } as Pet

      let callCount = 0

      server.use(
        http.get('http://localhost:3000/api/pets/123', () => {
          callCount++
          return HttpResponse.json({
            data: callCount === 1 ? initialPet : updatedPet,
          })
        })
      )

      const { result } = renderHook(() => usePetProfile('123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.pet?.name).toBe('Fluffy')

      act(() => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.pet?.name).toBe('Fluffy Updated')
      })
    })
  })
})
