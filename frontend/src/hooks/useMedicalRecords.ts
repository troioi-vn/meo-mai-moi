import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetMedicalRecords,
  usePostPetsPetMedicalRecords,
  usePutPetsPetMedicalRecordsRecord,
  useDeletePetsPetMedicalRecordsRecord,
  usePostPetsPetMedicalRecordsRecordPhotos,
  useDeletePetsPetMedicalRecordsRecordPhotosPhoto,
  getGetPetsPetMedicalRecordsQueryKey,
} from '@/api/generated/pets/pets'
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
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [recordTypeFilter, setRecordTypeFilter] = useState<string | undefined>(undefined)

  const params = { page, record_type: recordTypeFilter }
  const {
    data: queryData,
    isLoading,
    error: queryError,
  } = useGetPetsPetMedicalRecords(petId, params, {
    query: { enabled: petId > 0 },
  })

  const items = queryData?.data ?? []
  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = queryError ? 'Failed to load medical records' : null

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getGetPetsPetMedicalRecordsQueryKey(petId) })
  }, [queryClient, petId])

  const createMutation = usePostPetsPetMedicalRecords()
  const updateMutation = usePutPetsPetMedicalRecordsRecord()
  const deleteMutation = useDeletePetsPetMedicalRecordsRecord()
  const uploadPhotoMutation = usePostPetsPetMedicalRecordsRecordPhotos()
  const deletePhotoMutation = useDeletePetsPetMedicalRecordsRecordPhotosPhoto()

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg)
      invalidate()
    },
    [invalidate]
  )

  const create = useCallback(
    async (payload: {
      record_type: string
      description: string
      record_date: string
      vet_name?: string | null
    }) => {
      const item = await createMutation.mutateAsync({
        pet: petId,
        data: {
          ...payload,
          vet_name: payload.vet_name ?? undefined,
        },
      })
      setPage(1)
      invalidate()
      return item
    },
    [createMutation, petId, invalidate]
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
      const item = await updateMutation.mutateAsync({
        pet: petId,
        record: id,
        data: {
          ...payload,
          vet_name: payload.vet_name ?? undefined,
        },
      })
      invalidate()
      return item
    },
    [updateMutation, petId, invalidate]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, record: id })
      invalidate()
      return true
    },
    [deleteMutation, petId, invalidate]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File) => {
      const updatedRecord = await uploadPhotoMutation.mutateAsync({
        pet: petId,
        record: recordId,
        data: { photo: file },
      })
      invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate]
  )

  const deletePhoto = useCallback(
    async (recordId: number, photoId: number) => {
      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId, photo: photoId })
      invalidate()
    },
    [deletePhotoMutation, petId, invalidate]
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
