import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetVaccinations,
  usePostPetsPetVaccinations,
  usePutPetsPetVaccinationsRecord,
  useDeletePetsPetVaccinationsRecord,
  usePostPetsPetVaccinationsRecordRenew,
  usePostPetsPetVaccinationsRecordPhoto,
  useDeletePetsPetVaccinationsRecordPhoto,
  getGetPetsPetVaccinationsQueryKey,
} from '@/api/generated/pets/pets'
import type { VaccinationRecord } from '@/api/generated/model'
import type { GetPetsPetVaccinationsStatus as VaccinationStatus } from '@/api/generated/model'

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
  }) => Promise<VaccinationRecord>
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
  uploadPhoto: (recordId: number, file: File) => Promise<VaccinationRecord>
  deletePhoto: (recordId: number) => Promise<void>
}

export const useVaccinations = (
  petId: number,
  initialStatus: VaccinationStatus = 'active'
): UseVaccinationsResult => {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<VaccinationStatus>(initialStatus)

  const params = { page: 1, status }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetVaccinations(petId, params, {
    query: { enabled: petId > 0 },
  })

  const items = queryData?.data ?? []
  const loading = isLoading
  const error = isError ? 'Failed to load vaccinations' : null

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: getGetPetsPetVaccinationsQueryKey(petId) })
  }, [queryClient, petId])

  const createMutation = usePostPetsPetVaccinations()
  const updateMutation = usePutPetsPetVaccinationsRecord()
  const deleteMutation = useDeletePetsPetVaccinationsRecord()
  const renewMutation = usePostPetsPetVaccinationsRecordRenew()
  const uploadPhotoMutation = usePostPetsPetVaccinationsRecordPhoto()
  const deletePhotoMutation = useDeletePetsPetVaccinationsRecordPhoto()

  const create = useCallback(
    async (payload: {
      vaccine_name: string
      administered_at: string
      due_at?: string | null
      notes?: string | null
    }): Promise<VaccinationRecord> => {
      const created = await createMutation.mutateAsync({
        pet: petId,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
      return created
    },
    [createMutation, petId, invalidate]
  )

  const update = useCallback(
    async (
      id: number,
      payload: Partial<{
        vaccine_name: string
        administered_at: string
        due_at?: string | null
        notes?: string | null
      }>
    ) => {
      await updateMutation.mutateAsync({
        pet: petId,
        record: id,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
    },
    [updateMutation, petId, invalidate]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, record: id })
      await invalidate()
    },
    [deleteMutation, petId, invalidate]
  )

  const renew = useCallback(
    async (
      id: number,
      payload: {
        vaccine_name: string
        administered_at: string
        due_at?: string | null
        notes?: string | null
      }
    ): Promise<VaccinationRecord> => {
      const newRecord = await renewMutation.mutateAsync({
        pet: petId,
        record: id,
        data: {
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? undefined,
          notes: payload.notes ?? undefined,
        },
      })
      await invalidate()
      return newRecord
    },
    [renewMutation, petId, invalidate]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File): Promise<VaccinationRecord> => {
      const updatedRecord = await uploadPhotoMutation.mutateAsync({
        pet: petId,
        record: recordId,
        data: { photo: file },
      })
      await invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate]
  )

  const deletePhoto = useCallback(
    async (recordId: number): Promise<void> => {
      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId })
      await invalidate()
    },
    [deletePhotoMutation, petId, invalidate]
  )

  return {
    items,
    loading,
    error,
    status,
    setStatus,
    create,
    update,
    remove,
    renew,
    reload: invalidate,
    uploadPhoto,
    deletePhoto,
  }
}
