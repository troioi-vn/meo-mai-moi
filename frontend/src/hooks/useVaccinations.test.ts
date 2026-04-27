import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { useVaccinations } from './useVaccinations'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { VaccinationRecord } from '@/api/generated/model'
import { AllTheProviders } from '@/testing/providers'

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

  beforeEach(() => {
    server.resetHandlers()
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
