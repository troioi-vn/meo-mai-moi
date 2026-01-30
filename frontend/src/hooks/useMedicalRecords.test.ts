import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMedicalRecords } from './useMedicalRecords'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import type { MedicalRecord } from '@/api/generated/model'

describe('useMedicalRecords', () => {
  const petId = 123

  beforeEach(() => {
    server.resetHandlers()
  })

  describe('initial load', () => {
    it('success: loads medical records and sets state', async () => {
      const mockItems: MedicalRecord[] = [
        {
          id: 1,
          record_type: 'vaccination',
          description: 'Rabies vaccine',
          record_date: '2023-01-01',
          vet_name: 'Dr. Smith',
          photos: [],
        },
        {
          id: 2,
          record_type: 'checkup',
          description: 'Annual checkup',
          record_date: '2023-02-01',
          vet_name: null,
          photos: [],
        },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({
            data: {
              data: mockItems,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: { first: '...', last: '...' },
            },
          })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.items).toEqual(mockItems)
      expect(result.current.page).toBe(1)
      expect(result.current.error).toBeNull()
    })

    it('failure: sets error on API failure', async () => {
      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load medical records')
      expect(result.current.items).toEqual([])
    })
  })

  describe('filtering', () => {
    it('calling setRecordTypeFilter triggers refetch', async () => {
      const allItems: MedicalRecord[] = [
        {
          id: 1,
          record_type: 'vaccination',
          description: 'Rabies',
          record_date: '2023-01-01',
          vet_name: null,
          photos: [],
        },
        {
          id: 2,
          record_type: 'checkup',
          description: 'Checkup',
          record_date: '2023-02-01',
          vet_name: null,
          photos: [],
        },
      ]
      const vaccinationItems = [allItems[0]]

      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, ({ request }) => {
          callCount++
          const url = new URL(request.url)
          const recordType = url.searchParams.get('record_type')

          if (callCount === 1) {
            // Initial load, no filter
            expect(recordType).toBeNull()
            return HttpResponse.json({
              data: {
                data: allItems,
                meta: { total: 2, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          } else {
            // After filter
            expect(recordType).toBe('vaccination')
            return HttpResponse.json({
              data: {
                data: vaccinationItems,
                meta: { total: 1, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      act(() => {
        result.current.setRecordTypeFilter('vaccination')
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(1)
        expect(result.current.items[0].record_type).toBe('vaccination')
      })
    })
  })

  describe('create', () => {
    it('creates medical record, prepends to items, and refreshes', async () => {
      const existingItems: MedicalRecord[] = [
        {
          id: 1,
          record_type: 'checkup',
          description: 'Existing',
          record_date: '2023-01-01',
          vet_name: null,
          photos: [],
        },
      ]
      const newItem: MedicalRecord = {
        id: 2,
        record_type: 'vaccination',
        description: 'New vaccine',
        record_date: '2024-01-01',
        vet_name: 'Dr. New',
        photos: [],
      }
      let callCount = 0

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
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
            return HttpResponse.json({
              data: {
                data: [newItem, ...existingItems],
                meta: { total: 2, per_page: 15, current_page: 1 },
                links: {},
              },
            })
          }
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({ data: newItem })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.create({
          record_type: 'vaccination',
          description: 'New vaccine',
          record_date: '2024-01-01',
          vet_name: 'Dr. New',
        })
      })

      await waitFor(() => {
        expect(result.current.items).toHaveLength(2)
        expect(result.current.items[0]).toEqual(newItem)
      })
    })
  })

  describe('update', () => {
    it('updates medical record in place', async () => {
      const originalItem: MedicalRecord = {
        id: 1,
        record_type: 'checkup',
        description: 'Original',
        record_date: '2023-01-01',
        vet_name: 'Dr. Old',
        photos: [],
      }
      const updatedItem: MedicalRecord = {
        id: 1,
        record_type: 'checkup',
        description: 'Updated',
        record_date: '2023-01-01',
        vet_name: 'Dr. New',
        photos: [],
      }

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({
            data: {
              data: [originalItem],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.put(`http://localhost:3000/api/pets/${petId}/medical-records/1`, () => {
          return HttpResponse.json({ data: updatedItem })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.update(1, { description: 'Updated', vet_name: 'Dr. New' })
      })

      expect(result.current.items[0]).toEqual(updatedItem)
      expect(result.current.items).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes medical record from items', async () => {
      const items: MedicalRecord[] = [
        {
          id: 1,
          record_type: 'checkup',
          description: 'Record 1',
          record_date: '2023-01-01',
          vet_name: null,
          photos: [],
        },
        {
          id: 2,
          record_type: 'vaccination',
          description: 'Record 2',
          record_date: '2023-02-01',
          vet_name: null,
          photos: [],
        },
      ]

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({
            data: {
              data: items,
              meta: { total: 2, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/medical-records/1`, () => {
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.remove(1)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].id).toBe(2)
    })
  })

  describe('uploadPhoto', () => {
    it('uploads photo and updates the record', async () => {
      const originalRecord: MedicalRecord = {
        id: 1,
        record_type: 'checkup',
        description: 'Checkup',
        record_date: '2023-01-01',
        vet_name: null,
        photos: [],
      }
      const updatedRecord: MedicalRecord = {
        ...originalRecord,
        photos: [{ id: 1, url: 'photo.jpg', uploaded_at: '2024-01-01' }],
      }

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({
            data: {
              data: [originalRecord],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.post(`http://localhost:3000/api/pets/${petId}/medical-records/1/photos`, () => {
          return HttpResponse.json({ data: updatedRecord })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      const mockFile = new File(['photo content'], 'photo.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.uploadPhoto(1, mockFile)
      })

      expect(result.current.items[0]).toEqual(updatedRecord)
    })
  })

  describe('deletePhoto', () => {
    it('deletes photo and refreshes the record', async () => {
      const recordWithPhoto: MedicalRecord = {
        id: 1,
        record_type: 'checkup',
        description: 'Checkup',
        record_date: '2023-01-01',
        vet_name: null,
        photos: [{ id: 1, url: 'photo.jpg', uploaded_at: '2024-01-01' }],
      }
      const recordWithoutPhoto: MedicalRecord = {
        ...recordWithPhoto,
        photos: [],
      }

      let deleteCalled = false

      server.use(
        http.get(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
          return HttpResponse.json({
            data: {
              data: deleteCalled ? [recordWithoutPhoto] : [recordWithPhoto],
              meta: { total: 1, per_page: 15, current_page: 1 },
              links: {},
            },
          })
        }),
        http.delete(`http://localhost:3000/api/pets/${petId}/medical-records/1/photos/1`, () => {
          deleteCalled = true
          return HttpResponse.json({}, { status: 200 })
        })
      )

      const { result } = renderHook(() => useMedicalRecords(petId))

      await waitFor(() => { expect(result.current.loading).toBe(false); })

      await act(async () => {
        await result.current.deletePhoto(1, 1)
      })

      // After delete, refresh should be called, updating the record
      await waitFor(() => {
        expect(result.current.items[0].photos).toEqual([])
      })
    })
  })
})
