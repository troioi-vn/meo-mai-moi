import { useCallback, useEffect, useMemo, useState } from 'react'
import { createMicrochip, deleteMicrochip, getMicrochips, updateMicrochip, type PetMicrochip } from '@/api/pets'

export interface UseMicrochipsResult {
  items: PetMicrochip[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  refresh: (page?: number) => Promise<void>
  create: (payload: { chip_number: string; issuer?: string | null; implanted_at?: string | null }) => Promise<PetMicrochip>
  update: (
    id: number,
    payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>
  ) => Promise<PetMicrochip>
  remove: (id: number) => Promise<boolean>
}

export const useMicrochips = (petId: number): UseMicrochipsResult => {
  const [items, setItems] = useState<PetMicrochip[]>([])
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<unknown>(null)
  const [links, setLinks] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (pg = 1) => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMicrochips(petId, pg)
        setItems(res.data)
        setLinks(res.links)
        setMeta(res.meta)
        setPage(pg)
      } catch {
        setError('Failed to load microchips')
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
    async (payload: { chip_number: string; issuer?: string | null; implanted_at?: string | null }) => {
      const item = await createMicrochip(petId, payload)
      setItems((prev) => [item, ...prev])
      void refresh(1)
      return item
    },
    [petId, refresh]
  )

  const updateOne = useCallback(
    async (id: number, payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>) => {
      const item = await updateMicrochip(petId, id, payload)
      setItems((prev) => prev.map((n) => (n.id === id ? item : n)))
      return item
    },
    [petId]
  )

  const remove = useCallback(
    async (id: number) => {
      const ok = await deleteMicrochip(petId, id)
      if (ok) setItems((prev) => prev.filter((n) => n.id !== id))
      return ok
    },
    [petId]
  )

  return useMemo(
    () => ({ items, page, meta, links, loading, error, refresh, create, update: updateOne, remove }),
    [items, page, meta, links, loading, error, refresh, create, updateOne, remove]
  )
}
