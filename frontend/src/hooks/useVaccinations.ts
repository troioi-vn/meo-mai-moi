import { useEffect, useState } from 'react'
import {
  getVaccinations,
  createVaccination,
  updateVaccination,
  deleteVaccination,
  type VaccinationRecord,
} from '@/api/pets'

export interface UseVaccinationsResult {
  items: VaccinationRecord[]
  loading: boolean
  error: string | null
  create: (payload: { vaccine_name: string; administered_at: string; due_at?: string | null; notes?: string | null }) => Promise<void>
  update: (id: number, payload: Partial<{ vaccine_name: string; administered_at: string; due_at?: string | null; notes?: string | null }>) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useVaccinations = (petId: number): UseVaccinationsResult => {
  const [items, setItems] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await getVaccinations(petId, 1)
      setItems(resp.data)
    } catch {
      setError('Failed to load vaccinations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId])

  const create = async (payload: { vaccine_name: string; administered_at: string; due_at?: string | null; notes?: string | null }) => {
    const created = await createVaccination(petId, payload)
    setItems((prev) => [created, ...prev])
  }

  const update = async (
    id: number,
    payload: Partial<{ vaccine_name: string; administered_at: string; due_at?: string | null; notes?: string | null }>
  ) => {
    const updated = await updateVaccination(petId, id, payload)
    setItems((prev) => prev.map((w) => (w.id === id ? updated : w)))
  }

  const remove = async (id: number) => {
    await deleteVaccination(petId, id)
    setItems((prev) => prev.filter((w) => w.id !== id))
  }

  return { items, loading, error, create, update, remove }
}
