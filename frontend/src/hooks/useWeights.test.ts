import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'
import { useWeights } from './useWeights'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { WeightHistory } from '@/api/generated/model'
import { AllTheProviders } from '@/testing/providers'
import { listOperations, resetOperationsStoreForTests } from '@/offline/operations'
import { testQueryClient } from '@/testing/query-client'
import { getGetPetsPetWeightsQueryKey } from '@/api/generated/pets/pets'

const mockLoadUser = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    loadUser: mockLoadUser,
  }),
}))

const wrapper = AllTheProviders

describe('useWeights', () => {
  const petId = 123

  beforeEach(async () => {
    server.resetHandlers()
    mockLoadUser.mockReset()
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
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
    it('creates weight with tare payload, prepends to items, and refreshes', async () => {
      const existingItems: WeightHistory[] = [{ id: 1, weight_kg: 5.0, record_date: '2023-01-01' }]
      const newItem: WeightHistory = {
        id: 2,
        weight_kg: 5.5,
        record_date: '2024-01-01',
      }
      let callCount = 0
      let receivedPayload: unknown = null

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
        http.post(`http://localhost:3000/api/pets/${petId}/weights`, async ({ request }) => {
          receivedPayload = await request.json()
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
          tare_weight_kg: 62.4,
        })
      })

      expect(receivedPayload).toEqual({
        weight_kg: 5.5,
        record_date: '2024-01-01',
        tare_weight_kg: 62.4,
      })

      // After create and refresh, items should include the new item
      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
        expect(result.current.items[0]).toEqual(newItem)
      })
      expect(mockLoadUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('offline create', () => {
    const existingItems: WeightHistory[] = [{ id: 1, weight_kg: 5.0, record_date: '2023-01-01' }]

    function mockWeightsList() {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({
            data: {
              data: existingItems,
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        })
      )
    }

    it('enqueues an operation without calling the API', async () => {
      mockWeightsList()
      let postCalled = false

      server.use(
        http.post(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          postCalled = true
          return HttpResponse.json({ data: { id: 99, weight_kg: 5.5, record_date: '2024-01-01' } })
        })
      )

      onlineManager.setOnline(false)

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

      expect(postCalled).toBe(false)

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        entityType: 'weight',
        operation: 'create',
        entityId: petId,
        payload: {
          weight_kg: 5.5,
          record_date: '2024-01-01',
        },
        status: 'pending',
      })
      expect(operations[0]?.idempotencyKey).toBe(operations[0]?.localEntityId)
    })

    it('exposes the queued create in hook state', async () => {
      mockWeightsList()
      onlineManager.setOnline(false)

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

      await waitFor(() => {
        expect(result.current.pendingCreates).toHaveLength(1)
      })

      expect(result.current.pendingCreates[0]).toMatchObject({
        weight_kg: 5.5,
        record_date: '2024-01-01',
      })

      const pendingItem = result.current.items.find((item) => item.record_date === '2024-01-01')
      expect(pendingItem).toMatchObject({
        weight_kg: 5.5,
        record_date: '2024-01-01',
        pet_id: petId,
      })
      expect(pendingItem?.id).toBeDefined()
      if (pendingItem?.id == null) throw new Error('Expected pending weight id')
      expect(result.current.isPendingCreate(pendingItem.id)).toBe(true)
      expect(mockLoadUser).not.toHaveBeenCalled()
    })
  })

  describe('offline update', () => {
    const existingItems: WeightHistory[] = [{ id: 1, weight_kg: 5.0, record_date: '2023-01-01' }]

    function mockWeightsList() {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/weights`, () => {
          return HttpResponse.json({
            data: {
              data: existingItems,
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        })
      )
    }

    it('enqueues an operation without calling the API', async () => {
      mockWeightsList()
      let putCalled = false

      server.use(
        http.put(`http://localhost:3000/api/pets/${petId}/weights/1`, () => {
          putCalled = true
          return HttpResponse.json({ data: { id: 1, weight_kg: 5.5, record_date: '2023-01-01' } })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.update(1, { weight_kg: 5.5 })
      })

      expect(putCalled).toBe(false)

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        entityType: 'weight',
        operation: 'update',
        entityId: 1,
        payload: {
          petId,
          weightId: 1,
          weight_kg: 5.5,
        },
        status: 'pending',
      })
      expect(operations[0]?.idempotencyKey).toBeTruthy()
    })

    it('exposes the queued update in hook state', async () => {
      testQueryClient.setQueryData(getGetPetsPetWeightsQueryKey(petId, { page: 1 }), {
        data: existingItems,
        meta: { total: 1, per_page: 15, current_page: 1 },
        links: {},
      })

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await act(async () => {
        await result.current.update(1, { weight_kg: 5.5 })
      })

      await waitFor(() => {
        expect(result.current.pendingUpdates).toHaveLength(1)
      })

      expect(result.current.pendingUpdates[0]).toMatchObject({
        weightId: 1,
        weight_kg: 5.5,
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]).toMatchObject({
        id: 1,
        weight_kg: 5.5,
        record_date: '2023-01-01',
      })
      expect(mockLoadUser).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('updates weight with tare payload in place', async () => {
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
      let receivedPayload: unknown = null

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
        http.put(`http://localhost:3000/api/pets/${petId}/weights/1`, async ({ request }) => {
          updateDone = true
          receivedPayload = await request.json()
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useWeights(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.update(1, {
          weight_kg: 5.5,
          tare_weight_kg: 63.1,
        })
      })

      expect(receivedPayload).toEqual({ weight_kg: 5.5, tare_weight_kg: 63.1 })

      await waitFor(() => {
        expect(result.current.items[0]).toEqual(updatedItem)
      })
      expect(result.current.items).toHaveLength(1)
      expect(mockLoadUser).toHaveBeenCalledTimes(1)
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
              meta: {
                total: deleteDone ? 1 : 2,
                per_page: 15,
                current_page: 1,
              },
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
