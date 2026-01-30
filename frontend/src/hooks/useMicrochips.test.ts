import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMicrochips } from './useMicrochips'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { PetMicrochip } from '@/api/generated/model'

describe('useMicrochips', () => {
  const petId = 123

  beforeEach(() => {
    server.resetHandlers()
  })

  describe('initial load', () => {
    it('success: loads microchips and sets state', async () => {
      const mockItems: PetMicrochip[] = [
        { id: 1, chip_number: '123456789', issuer: 'Test Issuer', implanted_at: '2023-01-01' },
        { id: 2, chip_number: '987654321', issuer: null, implanted_at: null },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          return HttpResponse.json({
            data: {
              data: mockItems,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: { first: '...', last: '...' },
            },
          })
        })
      )

      const { result } = renderHook(() => useMicrochips(petId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.items).toEqual(mockItems)
      expect(result.current.page).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('failure: sets error on API failure', async () => {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useMicrochips(petId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load microchips')
      expect(result.current.items).toEqual([])
    })
  })

  describe('create', () => {
    it('creates microchip, prepends to items, and refreshes', async () => {
      const existingItems: PetMicrochip[] = [
        { id: 1, chip_number: 'existing', issuer: null, implanted_at: null },
      ]
      const newItem: PetMicrochip = {
        id: 2,
        chip_number: 'new-chip',
        issuer: 'New Issuer',
        implanted_at: '2024-01-01',
      }
      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          callCount++
          if (callCount === 1) {
            return HttpResponse.json({
              data: {
                data: existingItems,
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          } else {
            // After refresh
            return HttpResponse.json({
              data: {
                data: [newItem, ...existingItems],
                meta: { total: 2, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          return HttpResponse.json({ data: newItem })
        })
      )

      const { result } = renderHook(() => useMicrochips(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.create({
          chip_number: 'new-chip',
          issuer: 'New Issuer',
          implanted_at: '2024-01-01',
        })
      })

      // After create and refresh, items should include the new item
      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
        expect(result.current.items[0]).toEqual(newItem)
      })
    })
  })

  describe('update', () => {
    it('updates microchip in place', async () => {
      const originalItem: PetMicrochip = {
        id: 1,
        chip_number: 'original',
        issuer: 'Original Issuer',
        implanted_at: '2023-01-01',
      }
      const updatedItem: PetMicrochip = {
        id: 1,
        chip_number: 'updated',
        issuer: 'Updated Issuer',
        implanted_at: '2023-01-01',
      }

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          return HttpResponse.json({
            data: {
              data: [originalItem],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.put(`http://localhost:3000/api/pets/${petId}/microchips/1`, () => {
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useMicrochips(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.update(1, { chip_number: 'updated', issuer: 'Updated Issuer' })
      })

      expect(result.current.items[0]).toEqual(updatedItem)
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes microchip from items', async () => {
      const items: PetMicrochip[] = [
        { id: 1, chip_number: 'chip1', issuer: null, implanted_at: null },
        { id: 2, chip_number: 'chip2', issuer: null, implanted_at: null },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/microchips`, () => {
          return HttpResponse.json({
            data: {
              data: items,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/microchips/1`, () => {
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useMicrochips(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.remove(1)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].id).toBe(2)
    })
  })
})
