import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  postPetsPetMedicalRecords as createMedicalRecord,
  deletePetsPetMedicalRecordsRecord as deleteMedicalRecord,
  getPetsPetMedicalRecords as getMedicalRecords,
  putPetsPetMedicalRecordsRecord as updateMedicalRecord,
} from '@/api/generated/pets/pets'
import { api } from '@/api/axios'
import type { MedicalRecord } from '@/api/generated/model'

export interface UseMedicalRecordsResult {
  items: MedicalRecord[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  recordTypeFilter: string | undefined
  setRecordTypeFilter: (type: string | undefined) => void
  refresh: (page?: number) => Promise<void>
  create: (payload: {
    record_type: string
    description: string
    record_date: string
    vet_name?: string | null
  }) => Promise<MedicalRecord>
  update: (
    id: number,
    payload: Partial<{
      record_type: string
      description: string
      record_date: string
      vet_name?: string | null
    }>
  ) => Promise<MedicalRecord>
  remove: (id: number) => Promise<boolean>
  uploadPhoto: (recordId: number, file: File) => Promise<MedicalRecord>
  deletePhoto: (recordId: number, photoId: number) => Promise<void>
}

export const useMedicalRecords = (petId: number): UseMedicalRecordsResult => {
  const [items, setItems] = useState<MedicalRecord[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<unknown>(null)
  const [links, setLinks] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordTypeFilter, setRecordTypeFilter] = useState<string | undefined>(undefined)

  const load = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMedicalRecords(petId, { page: pg, record_type: recordTypeFilter })
        setItems(res.data ?? [])
        setLinks(res.links)
        setMeta(res.meta)
        setPage(pg)
      } catch {
        setError('Failed to load medical records')
      } finally {
        setLoading(false)
      }
    },
    [petId, recordTypeFilter]
  )

  useEffect(() => {
    void load(1)
  }, [load])

  const refresh = useCallback(
    async (pg?: number) => {
      await load(pg ?? page)
    },
    [load, page]
  )

  const create = useCallback(
    async (payload: {
      record_type: string
      description: string
      record_date: string
      vet_name?: string | null
    }) => {
      const apiPayload = {
        ...payload,
        vet_name: payload.vet_name ?? undefined,
      }
      const item = await createMedicalRecord(petId, apiPayload)
      setItems((prev) => [item, ...prev])
      void refresh(1)
      return item
    },
    [petId, refresh]
  )

  const updateOne = useCallback(
    async (
      id: number,
      payload: Partial<{
        record_type: string
        description: string
        record_date: string
        vet_name?: string | null
      }>
    ) => {
      const apiPayload: Partial<{
        record_type: string
        description: string
        record_date: string
        vet_name?: string
      }> = {
        ...payload,
        vet_name: payload.vet_name ?? undefined,
      }
      const item = await updateMedicalRecord(petId, id, apiPayload)
      setItems((prev) => prev.map((n) => (n.id === id ? item : n)))
      return item
    },
    [petId]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMedicalRecord(petId, id)
      setItems((prev) => prev.filter((n) => n.id !== id))
      return true
    },
    [petId]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File) => {
      const formData = new FormData()
      formData.append('photo', file)

      const updatedRecord = await api.post<MedicalRecord>(
        `/pets/${String(petId)}/medical-records/${String(recordId)}/photos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setItems((prev) => prev.map((n) => (n.id === recordId ? updatedRecord : n)))
      return updatedRecord
    },
    [petId]
  )

  const deletePhoto = useCallback(
    async (recordId: number, photoId: number) => {
      await api.delete(
        `/pets/${String(petId)}/medical-records/${String(recordId)}/photos/${String(photoId)}`
      )
      // Refresh to get updated record
      void refresh()
    },
    [petId, refresh]
  )

  return useMemo(
    () => ({
      items,
      page,
      meta,
      links,
      loading,
      error,
      recordTypeFilter,
      setRecordTypeFilter,
      refresh,
      create,
      update: updateOne,
      remove,
      uploadPhoto,
      deletePhoto,
    }),
    [
      items,
      page,
      meta,
      links,
      loading,
      error,
      recordTypeFilter,
      setRecordTypeFilter,
      refresh,
      create,
      updateOne,
      remove,
      uploadPhoto,
      deletePhoto,
    ]
  )
}
