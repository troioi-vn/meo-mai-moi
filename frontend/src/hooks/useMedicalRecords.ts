import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useNetworkStatus } from '@/hooks/use-network-status'
import {
  enqueueOperation,
  isMedicalRecordCreatePayload,
  isPendingMedicalRecordCreateOperation,
  listOperations,
  subscribe,
  type OfflineOperation,
  type MedicalRecordCreatePayload,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_MEDICAL_RECORDS: MedicalRecord[] = []

export type PendingMedicalRecordCreate = Omit<MedicalRecordCreatePayload, 'petId'> & {
  localEntityId: string
}

export interface UseMedicalRecordsResult {
  items: MedicalRecord[]
  pendingCreates: PendingMedicalRecordCreate[]
  isPendingCreate: (id: number) => boolean
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

function pendingMedicalRecordNumericId(localEntityId: string): number {
  let hash = 0
  for (let index = 0; index < localEntityId.length; index++) {
    hash = (Math.imul(31, hash) + localEntityId.charCodeAt(index)) | 0
  }

  if (hash === 0) return -1

  return hash > 0 ? -hash : hash
}

function operationToPendingMedicalRecord(
  operation: OfflineOperation
): PendingMedicalRecordCreate | null {
  if (!isMedicalRecordCreatePayload(operation.payload)) return null

  const { petId: _petId, ...createPayload } = operation.payload

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    ...createPayload,
  }
}

function pendingMedicalRecordToRecord(
  pending: PendingMedicalRecordCreate,
  petId: number
): MedicalRecord {
  return {
    id: pendingMedicalRecordNumericId(pending.localEntityId),
    pet_id: petId,
    record_type: pending.record_type,
    description: pending.description,
    record_date: pending.record_date,
    vet_name: pending.vet_name ?? null,
    photos: [],
  }
}

async function loadPendingMedicalRecordCreates(
  petId: number
): Promise<PendingMedicalRecordCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isPendingMedicalRecordCreateOperation(operation, petId))
    .map((operation) => operationToPendingMedicalRecord(operation))
    .filter((pending): pending is PendingMedicalRecordCreate => pending !== null)
}

export const useMedicalRecords = (petId: number): UseMedicalRecordsResult => {
  const queryClient = useQueryClient()
  const isOnline = useNetworkStatus()
  const [page, setPage] = useState(1)
  const [recordTypeFilter, setRecordTypeFilter] = useState<string | undefined>(undefined)
  const [pendingCreates, setPendingCreates] = useState<PendingMedicalRecordCreate[]>([])

  const params = { page, record_type: recordTypeFilter }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetMedicalRecords(petId, params, {
    query: { enabled: petId > 0 },
  })

  useEffect(() => {
    if (petId <= 0) {
      setPendingCreates([])
      return
    }

    let cancelled = false

    const refreshPendingOperations = async () => {
      const nextPendingCreates = await loadPendingMedicalRecordCreates(petId)
      if (!cancelled) {
        setPendingCreates(nextPendingCreates)
      }
    }

    void refreshPendingOperations()

    const unsubscribe = subscribe(() => {
      void refreshPendingOperations()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [petId])

  const serverItems = useMemo(() => queryData?.data ?? EMPTY_MEDICAL_RECORDS, [queryData])
  const pendingCreateIds = useMemo(
    () =>
      new Set(
        pendingCreates.map((pending) => pendingMedicalRecordNumericId(pending.localEntityId))
      ),
    [pendingCreates]
  )

  const isPendingCreate = useCallback((id: number) => pendingCreateIds.has(id), [pendingCreateIds])

  const items = useMemo(() => {
    const visiblePendingCreates =
      recordTypeFilter === undefined
        ? pendingCreates
        : pendingCreates.filter((pending) => pending.record_type === recordTypeFilter)

    const pendingItems = visiblePendingCreates.map((pending) =>
      pendingMedicalRecordToRecord(pending, petId)
    )
    const pendingIds = new Set(pendingItems.map((item) => item.id))
    const serverWithoutPendingDuplicates = serverItems.filter(
      (item) => item.id == null || !pendingIds.has(item.id)
    )

    return [...pendingItems, ...serverWithoutPendingDuplicates]
  }, [pendingCreates, petId, recordTypeFilter, serverItems])

  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = isError ? 'Failed to load medical records' : null

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: getGetPetsPetMedicalRecordsQueryKey(petId) })
  }, [queryClient, petId])

  const createMutation = usePostPetsPetMedicalRecords()
  const updateMutation = usePutPetsPetMedicalRecordsRecord()
  const deleteMutation = useDeletePetsPetMedicalRecordsRecord()
  const uploadPhotoMutation = usePostPetsPetMedicalRecordsRecordPhotos()
  const deletePhotoMutation = useDeletePetsPetMedicalRecordsRecordPhotosPhoto()

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg)
      await invalidate()
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
      if (!isOnline) {
        const localEntityId = generateQueueId()

        await enqueueOperation({
          idempotencyKey: localEntityId,
          entityType: 'medical_record',
          entityId: petId,
          operation: 'create',
          localEntityId,
          payload: {
            petId,
            record_type: payload.record_type,
            description: payload.description,
            record_date: payload.record_date,
            vet_name: payload.vet_name ?? null,
          },
        })

        const pending: PendingMedicalRecordCreate = {
          localEntityId,
          record_type: payload.record_type,
          description: payload.description,
          record_date: payload.record_date,
          vet_name: payload.vet_name ?? null,
        }

        return pendingMedicalRecordToRecord(pending, petId)
      }

      const item = await createMutation.mutateAsync({
        pet: petId,
        data: {
          ...payload,
          vet_name: payload.vet_name ?? undefined,
        },
      })
      setPage(1)
      await invalidate()
      return item
    },
    [createMutation, petId, invalidate, isOnline]
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
      await invalidate()
      return item
    },
    [updateMutation, petId, invalidate]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, record: id })
      await invalidate()
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
      await invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate]
  )

  const deletePhoto = useCallback(
    async (recordId: number, photoId: number) => {
      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId, photo: photoId })
      await invalidate()
    },
    [deletePhotoMutation, petId, invalidate]
  )

  return useMemo(
    () => ({
      items,
      pendingCreates,
      isPendingCreate,
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
      pendingCreates,
      isPendingCreate,
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
