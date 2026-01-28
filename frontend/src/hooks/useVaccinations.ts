import { useEffect, useState, useCallback } from 'react'
import {
  getPetsPetVaccinations as getVaccinations,
  postPetsPetVaccinations as createVaccination,
  putPetsPetVaccinationsRecord as updateVaccination,
  deletePetsPetVaccinationsRecord as deleteVaccination,
  postPetsPetVaccinationsRecordRenew as renewVaccination,
  type GetPetsPetVaccinations200Item as VaccinationRecord,
  type VaccinationStatus,
} from '@/api/generated/pets/pets'

export interface UseVaccinationsResult {
  items: VaccinationRecord[]
  loading: boolean
  error: string | null
  status: VaccinationStatus
  setStatus: (status: VaccinationStatus) => void
  create: (payload: {
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }) => Promise<void>
  update: (
    id: number,
    payload: Partial<{
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }>
  ) => Promise<void>
  remove: (id: number) => Promise<void>
  renew: (
    id: number,
    payload: {
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }
  ) => Promise<VaccinationRecord>
  reload: () => Promise<void>
}

export const useVaccinations = (
  petId: number,
  initialStatus: VaccinationStatus = 'active'
): UseVaccinationsResult => {
  const [items, setItems] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<VaccinationStatus>(initialStatus)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const resp = await getVaccinations(petId, { page: 1, status })
      setItems(resp.data)
    } catch {
      setError('Failed to load vaccinations')
    } finally {
      setLoading(false)
    }
  }, [petId, status])

  useEffect(() => {
    void load()
  }, [load])

  const create = async (payload: {
    vaccine_name: string
    administered_at: string
    due_at?: string | null
    notes?: string | null
  }) => {
    const created = await createVaccination(petId, payload)
    // Only add to list if we're viewing active records (new records are active)
    if (status === 'active' || status === 'all') {
      setItems((prev) => [created, ...prev])
    }
  }

  const update = async (
    id: number,
    payload: Partial<{
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }>
  ) => {
    const updated = await updateVaccination(petId, id, payload)
    setItems((prev) => prev.map((w) => (w.id === id ? updated : w)))
  }

  const remove = async (id: number) => {
    await deleteVaccination(petId, id)
    setItems((prev) => prev.filter((w) => w.id !== id))
  }

  const renew = async (
    id: number,
    payload: {
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }
  ): Promise<VaccinationRecord> => {
    const newRecord = await renewVaccination(petId, id, payload)
    // Reload the list to reflect the changes (old record completed, new record created)
    await load()
    return newRecord
  }

  return { items, loading, error, status, setStatus, create, update, remove, renew, reload: load }
}
