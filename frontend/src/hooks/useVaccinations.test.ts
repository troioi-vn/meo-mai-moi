import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useVaccinations } from './useVaccinations'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { VaccinationRecord } from '@/api/generated/model'

describe('useVaccinations', () => {
  const petId = 123

  beforeEach(() => {
    server.resetHandlers()
  })

  describe('initial load', () => {
    it('success: loads vaccinations and sets state', async () => {
      const mockItems: VaccinationRecord[] = [
        {
          id: 1,
          vaccine_name: 'Rabies',
          administered_at: '2023-01-01',
          due_at: '2024-01-01',
          notes: 'First dose',
          status: 'active',
          photos: [],
        },
        {
          id: 2,
          vaccine_name: 'DHPP',
          administered_at: '2023-02-01',
          due_at: '2024-02-01',
          notes: null,
          status: 'active',
          photos: [],
        },
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

      const { result } = renderHook(() => useVaccinations(petId))

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

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load vaccinations')
      expect(result.current.items).toEqual([])
    })
  })

  describe('status filtering', () => {
    it('changing status triggers reload', async () => {
      const activeItems: VaccinationRecord[] = [
        {
          id: 1,
          vaccine_name: 'Rabies',
          administered_at: '2023-01-01',
          due_at: '2024-01-01',
          notes: null,
          status: 'active',
          photos: [],
        },
      ]
      const expiredItems: VaccinationRecord[] = [
        {
          id: 2,
          vaccine_name: 'Old Vaccine',
          administered_at: '2020-01-01',
          due_at: '2021-01-01',
          notes: null,
          status: 'expired',
          photos: [],
        },
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
            expect(status).toBe('expired')
            return HttpResponse.json({
              data: {
                data: expiredItems,
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        })
      )

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      act(() => {
        result.current.setStatus('expired')
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
        expect(result.current.items[0].status).toBe('expired')
        expect(result.current.status).toBe('expired')
      })
    })
  })

  describe('create', () => {
    it('respects status: prepends when status is active or all', async () => {
      const existingItems: VaccinationRecord[] = [
        {
          id: 1,
          vaccine_name: 'Existing',
          administered_at: '2023-01-01',
          due_at: '2024-01-01',
          notes: null,
          status: 'active',
          photos: [],
        },
      ]
      const newItem: VaccinationRecord = {
        id: 2,
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: 'New dose',
        status: 'active',
        photos: [],
      }

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

      const { result } = renderHook(() => useVaccinations(petId, 'active'))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
          notes: 'New dose',
        })
      })

      expect(result.current.items).toHaveLength(2)
      expect(result.current.items[0]).toEqual(newItem)
    })

    it('does not prepend when status is expired', async () => {
      const existingItems: VaccinationRecord[] = [
        {
          id: 1,
          vaccine_name: 'Expired',
          administered_at: '2020-01-01',
          due_at: '2021-01-01',
          notes: null,
          status: 'expired',
          photos: [],
        },
      ]
      const newItem: VaccinationRecord = {
        id: 2,
        vaccine_name: 'New Vaccine',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: null,
        status: 'active',
        photos: [],
      }

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

      const { result } = renderHook(() => useVaccinations(petId, 'expired'))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.create({
          vaccine_name: 'New Vaccine',
          administered_at: '2024-01-01',
          due_at: '2025-01-01',
        })
      })

      // Should not prepend since status is expired
      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].id).toBe(1)
    })
  })

  describe('update', () => {
    it('updates vaccination in place', async () => {
      const originalItem: VaccinationRecord = {
        id: 1,
        vaccine_name: 'Original',
        administered_at: '2023-01-01',
        due_at: '2024-01-01',
        notes: 'Original notes',
        status: 'active',
        photos: [],
      }
      const updatedItem: VaccinationRecord = {
        id: 1,
        vaccine_name: 'Updated',
        administered_at: '2023-01-01',
        due_at: '2024-01-01',
        notes: 'Updated notes',
        status: 'active',
        photos: [],
      }

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: [originalItem],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.update(1, { vaccine_name: 'Updated', notes: 'Updated notes' })
      })

      expect(result.current.items[0]).toEqual(updatedItem)
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes vaccination from items', async () => {
      const items: VaccinationRecord[] = [
        {
          id: 1,
          vaccine_name: 'Vaccine 1',
          administered_at: '2023-01-01',
          due_at: '2024-01-01',
          notes: null,
          status: 'active',
          photos: [],
        },
        {
          id: 2,
          vaccine_name: 'Vaccine 2',
          administered_at: '2023-02-01',
          due_at: '2024-02-01',
          notes: null,
          status: 'active',
          photos: [],
        },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: items,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/1`, () => {
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.remove(1)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].id).toBe(2)
    })
  })

  describe('renew', () => {
    it('renews vaccination and reloads the list', async () => {
      const oldRecord: VaccinationRecord = {
        id: 1,
        vaccine_name: 'Rabies',
        administered_at: '2023-01-01',
        due_at: '2024-01-01',
        notes: null,
        status: 'active',
        photos: [],
      }
      const newRecord: VaccinationRecord = {
        id: 2,
        vaccine_name: 'Rabies',
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
        notes: 'Renewed',
        status: 'active',
        photos: [],
      }

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

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      let returnedRecord: VaccinationRecord
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
      const originalRecord: VaccinationRecord = {
        id: 1,
        vaccine_name: 'Rabies',
        administered_at: '2023-01-01',
        due_at: '2024-01-01',
        notes: null,
        status: 'active',
        photos: [],
      }
      const updatedRecord: VaccinationRecord = {
        ...originalRecord,
        photos: [{ id: 1, url: 'photo.jpg', uploaded_at: '2024-01-01' }],
      }

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
          return HttpResponse.json({
            data: {
              data: [originalRecord],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/vaccinations/1/photo`, () => {
          return HttpResponse.json({ data: updatedRecord })
        })
      )

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      const mockFile = new File(['photo content'], 'photo.jpg', { type: 'image/jpeg' })

      let returnedRecord: VaccinationRecord
      await act(async () => {
        returnedRecord = await result.current.uploadPhoto(1, mockFile)
      })

      expect(returnedRecord).toEqual(updatedRecord)
      expect(result.current.items[0]).toEqual(updatedRecord)
    })
  })

  describe('deletePhoto', () => {
    it('deletes photo and reloads the list', async () => {
      const recordWithPhoto: VaccinationRecord = {
        id: 1,
        vaccine_name: 'Rabies',
        administered_at: '2023-01-01',
        due_at: '2024-01-01',
        notes: null,
        status: 'active',
        photos: [{ id: 1, url: 'photo.jpg', uploaded_at: '2024-01-01' }],
      }
      const recordWithoutPhoto: VaccinationRecord = {
        ...recordWithPhoto,
        photos: [],
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

      const { result } = renderHook(() => useVaccinations(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.deletePhoto(1)
      })

      // After delete, load should be called, updating the record
      await waitFor(() => {
        expect(result.current.items[0].photos).toEqual([])
      })
    })
  })
})
