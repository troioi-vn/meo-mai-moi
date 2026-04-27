import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { useWeights } from './useWeights'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { WeightHistory } from '@/api/generated/model'
import { AllTheProviders } from '@/testing/providers'

const wrapper = AllTheProviders

describe('useWeights', () => {
  const petId = 123

  beforeEach(() => {
    server.resetHandlers()
  })

  describe('initial load', () => {
    it('success: loads weights and sets state', async () => {
      const mockItems: WeightHistory[] = [
        { id: 1, weight_kg: 5.5, record_date: '2023-01-01' },
        { id: 2, weight_kg: 6.0, record_date: '2023-02-01' },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({
            data: {
              data: mockItems,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: { first: '...', last: '...' },
            },
          })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.items).toEqual(mockItems)
      expect(result.current.page).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('failure: sets error on API failure', async () => {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load weights')
      expect(result.current.items).toEqual([])
    })
  })

  describe('create', () => {
    it('creates weight, prepends to items, and refreshes', async () => {
      const existingItems: WeightHistory[] = [{ id: 1, weight_kg: 5.0, record_date: '2023-01-01' }]
      const newItem: WeightHistory = {
        id: 2,
        weight_kg: 5.5,
        record_date: '2024-01-01',
      }
      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
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
        http.post(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({ data: newItem })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          weight_kg: 5.5,
          record_date: '2024-01-01',
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
    it('updates weight in place', async () => {
      const originalItem: WeightHistory = {
        id: 1,
        weight_kg: 5.0,
        record_date: '2023-01-01',
      }
      const updatedItem: WeightHistory = {
        id: 1,
        weight_kg: 5.5,
        record_date: '2023-01-01',
      }

      let updateDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({
            data: {
              data: [updateDone ? updatedItem : originalItem],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.put(`http://localhost:3000/api/pets/${petId}/weights/1`, () => {
          updateDone = true
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.update(1, { weight_kg: 5.5 })
      })

      await waitFor(() => {
        expect(result.current.items[0]).toEqual(updatedItem)
      })
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes weight from items', async () => {
      const items: WeightHistory[] = [
        { id: 1, weight_kg: 5.0, record_date: '2023-01-01' },
        { id: 2, weight_kg: 6.0, record_date: '2023-02-01' },
      ]

      let deleteDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({
            data: {
              data: deleteDone ? [items[1]] : items,
              meta: { total: deleteDone ? 1 : 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/weights/1`, () => {
          deleteDone = true
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.remove(1)
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })
      const firstItem = result.current.items[0]
      expect(firstItem).toBeDefined()
      if (!firstItem) throw new Error('Expected remaining weight record')
      expect(firstItem.id).toBe(2)
    })
  })
})
