import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createWeight,
  deleteWeight,
  getPetWeights,
  updateWeight,
  type WeightHistory,
} from '@/api/pets'

export interface UseWeightsResult {
  items: WeightHistory[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  refresh: (page?: number) => Promise<void>
  create: (payload: { weight_kg: number; record_date: string }) => Promise<WeightHistory>
  update: (
    id: number,
    payload: Partial<{ weight_kg: number; record_date: string }>
  ) => Promise<WeightHistory>
  remove: (id: number) => Promise<boolean>
}

export const useWeights = (petId: number): UseWeightsResult => {
  const [items, setItems] = useState<WeightHistory[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<unknown>(null)
  const [links, setLinks] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getPetWeights(petId, pg)
        setItems(res.data)
        setLinks(res.links)
        setMeta(res.meta)
        setPage(pg)
      } catch {
        setError('Failed to load weights')
      } finally {
        setLoading(false)
      }
    },
    [petId]
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
    async (payload: { weight_kg: number; record_date: string }) => {
      const item = await createWeight(petId, payload)
      // optimistic: prepend and refresh
      setItems((prev) => [item, ...prev])
      void refresh(1)
      return item
    },
    [petId, refresh]
  )

  const updateOne = useCallback(
    async (id: number, payload: Partial<{ weight_kg: number; record_date: string }>) => {
      const item = await updateWeight(petId, id, payload)
      setItems((prev) => prev.map((w) => (w.id === id ? item : w)))
      return item
    },
    [petId]
  )

  const remove = useCallback(
    async (id: number) => {
      const ok = await deleteWeight(petId, id)
      if (ok) setItems((prev) => prev.filter((w) => w.id !== id))
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
      refresh,
      create,
      update: updateOne,
      remove,
    }),
    [items, page, meta, links, loading, error, refresh, create, updateOne, remove]
  )
}
