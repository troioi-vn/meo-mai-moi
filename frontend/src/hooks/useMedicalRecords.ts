import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecords,
  updateMedicalRecord,
  type MedicalRecord,
  type MedicalRecordType,
} from '@/api/pets'

export interface UseMedicalRecordsResult {
  items: MedicalRecord[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  recordTypeFilter: MedicalRecordType | undefined
  setRecordTypeFilter: (type: MedicalRecordType | undefined) => void
  refresh: (page?: number) => Promise<void>
  create: (payload: {
    record_type: MedicalRecordType
    description: string
    record_date: string
    vet_name?: string | null
    attachment_url?: string | null
  }) => Promise<MedicalRecord>
  update: (
    id: number,
    payload: Partial<{
      record_type: MedicalRecordType
      description: string
      record_date: string
      vet_name?: string | null
      attachment_url?: string | null
    }>
  ) => Promise<MedicalRecord>
  remove: (id: number) => Promise<boolean>
}

export const useMedicalRecords = (petId: number): UseMedicalRecordsResult => {
  const [items, setItems] = useState<MedicalRecord[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<unknown>(null)
  const [links, setLinks] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordTypeFilter, setRecordTypeFilter] = useState<MedicalRecordType | undefined>(undefined)

  const load = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMedicalRecords(petId, pg, recordTypeFilter)
        setItems(res.data)
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
      record_type: MedicalRecordType
      description: string
      record_date: string
      vet_name?: string | null
      attachment_url?: string | null
    }) => {
      const item = await createMedicalRecord(petId, payload)
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
        record_type: MedicalRecordType
        description: string
        record_date: string
        vet_name?: string | null
        attachment_url?: string | null
      }>
    ) => {
      const item = await updateMedicalRecord(petId, id, payload)
      setItems((prev) => prev.map((n) => (n.id === id ? item : n)))
      return item
    },
    [petId]
  )

  const remove = useCallback(
    async (id: number) => {
      const ok = await deleteMedicalRecord(petId, id)
      if (ok) setItems((prev) => prev.filter((n) => n.id !== id))
      return ok
    },
    [petId]
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
    ]
  )
}
