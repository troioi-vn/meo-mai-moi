import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'
import { useVaccinations, VACCINATION_ONLINE_ONLY_ERROR } from './useVaccinations'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { VaccinationRecord } from '@/api/generated/model'
import { AllTheProviders } from '@/testing/providers'
import { testQueryClient } from '@/testing/query-client'
import { listOperations, resetOperationsStoreForTests } from '@/offline/operations'
import { getGetPetsPetVaccinationsQueryKey } from '@/api/generated/pets/pets'

const wrapper = AllTheProviders

const createVaccinationRecord = (
  overrides: Partial<VaccinationRecord> = {}
): VaccinationRecord => ({
  id: 1,
  pet_id: 123,
  vaccine_name: 'Rabies',
  administered_at: '2023-01-01',
  due_at: '2024-01-01',
  notes: 'First dose',
  completed_at: null,
  photo_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('useVaccinations', () => {
  const petId = 123

  beforeEach(async () => {
    server.resetHandlers()
    onlineManager.setOnline(true)
    testQueryClient.clear()
    await resetOperationsStoreForTests()
  })

  describe('initial load', () => {
    it('success: loads vaccinations and sets state', async () => {
      const mockItems: VaccinationRecord[] = [
        createVaccinationRecord(),
        createVaccinationRecord({
          id: 2,
          vaccine_name: 'DHPP',
          administered_at: '2023-02-01',
          due_at: '2024-02-01',
          notes: undefined,
        }),
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('status')).toBe('active')
          expect(url.searchParams.get('page')).toBe('1')
          return HttpResponse.json({
            data: {
              data: mockItems,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.items).toEqual(mockItems)
      expect(result.current.status).toBe('active')
      expect(result.current.error).toBeNull()
    })

    it('failure: sets error on API failure', async () => {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load vaccinations')
      expect(result.current.items).toEqual([])
    })
  })

  describe('status filtering', () => {
    it('changing status triggers reload', async () => {
      const activeItems: VaccinationRecord[] = [createVaccinationRecord({ notes: undefined })]
      const completedItems: VaccinationRecord[] = [
        createVaccinationRecord({
          id: 2,
          vaccine_name: 'Old Vaccine',
          administered_at: '2020-01-01',
          due_at: '2021-01-01',
          notes: undefined,
          completed_at: '2021-02-01T00:00:00Z',
        }),
      ]

      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, ({ request }) => {
          callCount++
          const url = new URL(request.url)
          const status = url.searchParams.get('status')

          if (callCount === 1) {
            expect(status).toBe('active')
            return HttpResponse.json({
              data: {
                data: activeItems,
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          } else {
            expect(status).toBe('completed')
            return HttpResponse.json({
              data: {
                data: completedItems,
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.setStatus('completed')
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
        const firstItem = result.current.items[0]
        expect(firstItem).toBeDefined()
        if (!firstItem) throw new Error('Expected completed vaccination')
        expect(firstItem.completed_at).toBe('2021-02-01T00:00:00Z')
        expect(result.current.status).toBe('completed')
      })
    })
  })

  describe('create', () => {
    it('respects status: prepends when status is active or all', async () => {
      const existingItems: VaccinationRecord[] = [
        createVaccinationRecord({
          id: 1,
          vaccine_name: 'Existing',
          notes: undefined,
        }),
      ]
      const newItem: VaccinationRecord = createVaccinationRecord({
        id: 2,
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: 'New dose',
      })

      let createDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: createDone ? [newItem, ...existingItems] : existingItems,
              meta: { total: createDone ? 2 : 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          createDone = true
          return HttpResponse.json({ data: newItem })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'New dose',
        })
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })
      const firstItem = result.current.items[0]
      expect(firstItem).toBeDefined()
      if (!firstItem) throw new Error('Expected created vaccination')
      expect(firstItem).toEqual(newItem)
    })

    it('does not prepend when status is completed', async () => {
      const existingItems: VaccinationRecord[] = [
        createVaccinationRecord({
          id: 1,
          vaccine_name: 'Completed',
          administered_at: '2020-01-01',
          due_at: '2021-01-01',
          notes: undefined,
          completed_at: '2021-02-01T00:00:00Z',
        }),
      ]
      const newItem: VaccinationRecord = createVaccinationRecord({
        id: 2,
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: undefined,
      })

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: existingItems,
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({ data: newItem })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId, 'completed'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
        })
      })

      // Should not prepend since status is expired
      expect(result.current.items).toHaveLength(1)
      const firstItem = result.current.items[0]
      expect(firstItem).toBeDefined()
      if (!firstItem) throw new Error('Expected completed vaccination to remain')
      expect(firstItem.id).toBe(1)
    })
  })

  describe('offline create', () => {
    const existingItems: VaccinationRecord[] = [
      createVaccinationRecord({
        id: 1,
        vaccine_name: 'Existing',
        notes: undefined,
      }),
    ]

    function mockVaccinationsList() {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
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
      mockVaccinationsList()
      let postCalled = false

      server.use(
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          postCalled = true
          return HttpResponse.json({ data: createVaccinationRecord({ id: 99 }) })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'Offline dose',
        })
      })

      expect(postCalled).toBe(false)

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        entityType: 'vaccination',
        operation: 'create',
        entityId: petId,
        payload: {
          petId,
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'Offline dose',
        },
        status: 'pending',
      })
      expect(operations[0]?.idempotencyKey).toBe(operations[0]?.localEntityId)
    })

    it('exposes the queued create in hook state', async () => {
      mockVaccinationsList()
      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'Offline dose',
        })
      })

      await waitFor(() => {
        expect(result.current.pendingCreates).toHaveLength(1)
      })

      expect(result.current.pendingCreates[0]).toMatchObject({
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: 'Offline dose',
      })

      const pendingItem = result.current.items.find(
        (item) => item.vaccine_name === 'New Vaccine' && item.administered_at === '2024-01-01'
      )
      expect(pendingItem).toMatchObject({
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        pet_id: petId,
      })
      expect(pendingItem?.id).toBeDefined()
      if (pendingItem?.id == null) throw new Error('Expected pending vaccination id')
      expect(result.current.isPendingCreate(pendingItem.id)).toBe(true)
    })

    it('keeps pending create out of the completed list view', async () => {
      const completedItems: VaccinationRecord[] = [
        createVaccinationRecord({
          id: 1,
          vaccine_name: 'Completed',
          administered_at: '2020-01-01',
          due_at: '2021-01-01',
          notes: undefined,
          completed_at: '2021-02-01T00:00:00Z',
        }),
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: completedItems,
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'completed'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
        })
      })

      await waitFor(() => {
        expect(result.current.pendingCreates).toHaveLength(1)
      })

      expect(result.current.items).toHaveLength(0)
      expect(result.current.items.some((item) => item.vaccine_name === 'New Vaccine')).toBe(false)
    })
  })

  describe('offline update', () => {
    const existingItems: VaccinationRecord[] = [
      createVaccinationRecord({
        id: 1,
        vaccine_name: 'Original',
        notes: 'Original notes',
      }),
    ]

    it('enqueues an operation without calling the API', async () => {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: existingItems,
          meta: { total: 1, per_page: 15, current_page: 1 },
          links: {},
        }
      )

      let putCalled = false
      server.use(
        http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          putCalled = true
          return HttpResponse.json({ data: existingItems[0] })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await act(async () => {
        await result.current.update(1, { vaccine_name: 'Updated', notes: 'Updated notes' })
      })

      expect(putCalled).toBe(false)

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        entityType: 'vaccination',
        operation: 'update',
        entityId: 1,
        payload: {
          petId,
          recordId: 1,
          vaccine_name: 'Updated',
          notes: 'Updated notes',
        },
        status: 'pending',
      })
      expect(operations[0]?.idempotencyKey).toBeTruthy()
    })

    it('exposes the queued update in hook state', async () => {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: existingItems,
          meta: { total: 1, per_page: 15, current_page: 1 },
          links: {},
        }
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await act(async () => {
        await result.current.update(1, { vaccine_name: 'Updated', notes: 'Updated notes' })
      })

      await waitFor(() => {
        expect(result.current.pendingUpdates).toHaveLength(1)
      })

      expect(result.current.pendingUpdates[0]).toMatchObject({
        recordId: 1,
        vaccine_name: 'Updated',
        notes: 'Updated notes',
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]).toMatchObject({
        id: 1,
        vaccine_name: 'Updated',
        notes: 'Updated notes',
      })
    })

    it('updates a pending create in place without enqueueing an update operation', async () => {
      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'Pending Vaccine',
          administered_at: '2024-01-01',
        })
      })

      const pendingItem = result.current.items.find(
        (item) => item.vaccine_name === 'Pending Vaccine'
      )
      expect(pendingItem?.id).toBeDefined()
      if (pendingItem?.id == null) throw new Error('Expected pending vaccination id')
      const pendingItemId = pendingItem.id

      await act(async () => {
        await result.current.update(pendingItemId, {
          vaccine_name: 'Edited Pending',
          notes: 'Edited offline',
        })
      })

      await waitFor(() => {
        expect(result.current.pendingCreates[0]?.vaccine_name).toBe('Edited Pending')
      })

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        operation: 'create',
        payload: {
          petId,
          vaccine_name: 'Edited Pending',
          administered_at: '2024-01-01',
          notes: 'Edited offline',
        },
      })
    })
  })

  describe('offline delete', () => {
    const existingItems: VaccinationRecord[] = [
      createVaccinationRecord({ id: 1, vaccine_name: 'Vaccine 1', notes: undefined }),
      createVaccinationRecord({
        id: 2,
        vaccine_name: 'Vaccine 2',
        administered_at: '2023-02-01',
        due_at: '2024-02-01',
        notes: undefined,
      }),
    ]

    it('enqueues an operation without calling the API', async () => {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: existingItems,
          meta: { total: 2, per_page: 15, current_page: 1 },
          links: {},
        }
      )

      let deleteCalled = false
      server.use(
        http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          deleteCalled = true
          return HttpResponse.json({ data: true })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      await act(async () => {
        await result.current.remove(1)
      })

      expect(deleteCalled).toBe(false)

      const operations = await listOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0]).toMatchObject({
        entityType: 'vaccination',
        operation: 'delete',
        entityId: 1,
        payload: {
          petId,
          recordId: 1,
        },
        status: 'pending',
      })
    })

    it('hides the deleted vaccination from hook state immediately', async () => {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: existingItems,
          meta: { total: 2, per_page: 15, current_page: 1 },
          links: {},
        }
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
      })

      await act(async () => {
        await result.current.remove(1)
      })

      await waitFor(() => {
        expect(result.current.pendingDeletes).toHaveLength(1)
      })

      expect(result.current.pendingDeletes[0]).toMatchObject({ recordId: 1 })
      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0]?.id).toBe(2)
    })

    it('removes a pending create instead of enqueueing delete', async () => {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: [existingItems[0]],
          meta: { total: 1, per_page: 15, current_page: 1 },
          links: {},
        }
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'Pending Vaccine',
          administered_at: '2024-01-01',
        })
      })

      const pendingItem = result.current.items.find(
        (item) => item.vaccine_name === 'Pending Vaccine'
      )
      expect(pendingItem?.id).toBeDefined()
      if (pendingItem?.id == null) throw new Error('Expected pending vaccination id')
      const pendingItemId = pendingItem.id

      await act(async () => {
        await result.current.remove(pendingItemId)
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      expect(await listOperations()).toHaveLength(0)
      expect(result.current.items[0]?.id).toBe(1)
    })
  })

  describe('update', () => {
    it('updates vaccination in place', async () => {
      const originalItem: VaccinationRecord = createVaccinationRecord({
        id: 1,
        vaccine_name: 'Original',
        notes: 'Original notes',
      })
      const updatedItem: VaccinationRecord = createVaccinationRecord({
        id: 1,
        vaccine_name: 'Updated',
        notes: 'Updated notes',
      })

      let updateDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: updateDone ? [updatedItem] : [originalItem],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          updateDone = true
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.update(1, { vaccine_name: 'Updated', notes: 'Updated notes' })
      })

      await waitFor(() => {
        const firstItem = result.current.items[0]
        expect(firstItem).toBeDefined()
        if (!firstItem) throw new Error('Expected updated vaccination')
        expect(firstItem).toEqual(updatedItem)
      })
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes vaccination from items', async () => {
      const items: VaccinationRecord[] = [
        createVaccinationRecord({
          id: 1,
          vaccine_name: 'Vaccine 1',
          notes: undefined,
        }),
        createVaccinationRecord({
          id: 2,
          vaccine_name: 'Vaccine 2',
          administered_at: '2023-02-01',
          due_at: '2024-02-01',
          notes: undefined,
        }),
      ]

      let deleteDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: deleteDone ? [items[1]] : items,
              meta: { total: deleteDone ? 1 : 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          deleteDone = true
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

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
      if (!firstItem) throw new Error('Expected remaining vaccination')
      expect(firstItem.id).toBe(2)
    })
  })

  describe('offline online-only actions', () => {
    const existingItems: VaccinationRecord[] = [
      createVaccinationRecord({
        id: 1,
        notes: undefined,
        photo_url: 'photo.jpg',
      }),
    ]

    function mockVaccinationsList() {
      testQueryClient.setQueryData(
        getGetPetsPetVaccinationsQueryKey(petId, { page: 1, status: 'active' }),
        {
          data: existingItems,
          meta: { total: 1, per_page: 15, current_page: 1 },
          links: {},
        }
      )
    }

    it('renew rejects without calling the API', async () => {
      mockVaccinationsList()
      let renewCalled = false

      server.use(
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations/1/renew`, () => {
          renewCalled = true
          return HttpResponse.json({ data: existingItems[0] })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await expect(
        act(async () => {
          await result.current.renew(1, {
            vaccine_name: 'Rabies',
            administered_at: '2024-01-01',
            due_at: '2025-01-01',
            notes: 'Renewed',
          })
        })
      ).rejects.toThrow(VACCINATION_ONLINE_ONLY_ERROR)

      expect(renewCalled).toBe(false)
    })

    it('uploadPhoto rejects without calling the API', async () => {
      mockVaccinationsList()
      let uploadCalled = false

      server.use(
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations/1/photo`, () => {
          uploadCalled = true
          return HttpResponse.json({ data: existingItems[0] })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      const mockFile = new File(['photo content'], 'photo.jpg', { type: 'image/jpeg' })

      await expect(
        act(async () => {
          await result.current.uploadPhoto(1, mockFile)
        })
      ).rejects.toThrow(VACCINATION_ONLINE_ONLY_ERROR)

      expect(uploadCalled).toBe(false)
    })

    it('deletePhoto rejects without calling the API', async () => {
      mockVaccinationsList()
      let deleteCalled = false

      server.use(
        http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/1/photo`, () => {
          deleteCalled = true
          return HttpResponse.json({}, { status: 200 })
        })
      )

      onlineManager.setOnline(false)

      const { result } = renderHook(() => useVaccinations(petId, 'active'), { wrapper })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
      })

      await expect(
        act(async () => {
          await result.current.deletePhoto(1)
        })
      ).rejects.toThrow(VACCINATION_ONLINE_ONLY_ERROR)

      expect(deleteCalled).toBe(false)
    })
  })

  describe('renew', () => {
    it('renews vaccination and reloads the list', async () => {
      const oldRecord: VaccinationRecord = createVaccinationRecord({
        id: 1,
        notes: undefined,
      })
      const newRecord: VaccinationRecord = createVaccinationRecord({
        id: 2,
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: 'Renewed',
      })

      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          callCount++
          if (callCount === 1) {
            return HttpResponse.json({
              data: {
                data: [oldRecord],
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          } else {
            // After renew, load is called again
            return HttpResponse.json({
              data: {
                data: [newRecord], // Assuming old is completed, new is added
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations/1/renew`, () => {
          return HttpResponse.json({ data: newRecord })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let returnedRecord: VaccinationRecord | undefined
      await act(async () => {
        returnedRecord = await result.current.renew(1, {
          vaccine_name: 'Rabies',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'Renewed',
        })
      })

      expect(returnedRecord).toEqual(newRecord)

      // After renew, load should have been called, updating the list
      await waitFor(() => {
        expect(result.current.items).toEqual([newRecord])
      })
    })
  })

  describe('uploadPhoto', () => {
    it('uploads photo and updates the record', async () => {
      const originalRecord: VaccinationRecord = createVaccinationRecord({
        id: 1,
        notes: undefined,
      })
      const updatedRecord: VaccinationRecord = {
        ...originalRecord,
        photo_url: 'photo.jpg',
      }

      let uploadDone = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: [uploadDone ? updatedRecord : originalRecord],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations/1/photo`, () => {
          uploadDone = true
          return HttpResponse.json({ data: updatedRecord })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const mockFile = new File(['photo content'], 'photo.jpg', { type: 'image/jpeg' })

      let returnedRecord: VaccinationRecord | undefined
      await act(async () => {
        returnedRecord = await result.current.uploadPhoto(1, mockFile)
      })

      expect(returnedRecord).toEqual(updatedRecord)
      await waitFor(() => {
        const firstItem = result.current.items[0]
        expect(firstItem).toBeDefined()
        if (!firstItem) throw new Error('Expected uploaded vaccination photo record')
        expect(firstItem).toEqual(updatedRecord)
      })
    })
  })

  describe('deletePhoto', () => {
    it('deletes photo and reloads the list', async () => {
      const recordWithPhoto: VaccinationRecord = createVaccinationRecord({
        id: 1,
        notes: undefined,
        photo_url: 'photo.jpg',
      })
      const recordWithoutPhoto: VaccinationRecord = {
        ...recordWithPhoto,
        photo_url: null,
      }

      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          callCount++
          return HttpResponse.json({
            data: {
              data: callCount === 1 ? [recordWithPhoto] : [recordWithoutPhoto],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/1/photo`, () => {
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deletePhoto(1)
      })

      // After delete, invalidation triggers refetch, updating the record
      await waitFor(() => {
        const firstItem = result.current.items[0]
        expect(firstItem).toBeDefined()
        if (!firstItem) throw new Error('Expected vaccination without photo')
        expect(firstItem.photo_url).toBeNull()
      })
    })
  })
})
