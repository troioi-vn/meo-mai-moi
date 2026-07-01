import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetMedicalRecords,
  usePostPetsPetMedicalRecords,
  usePutPetsPetMedicalRecordsRecord,
  useDeletePetsPetMedicalRecordsRecord,
  usePostPetsPetMedicalRecordsRecordPhotos,
  useDeletePetsPetMedicalRecordsRecordPhotosPhoto,
} from '@/api/generated/pets/pets'
import type { MedicalRecord } from '@/api/generated/model'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { invalidatePetMedicalRecords } from '@/lib/health-record-cache'
import {
  enqueueOperation,
  isActiveMedicalRecordDeleteOperation,
  isMedicalRecordCreatePayload,
  isMedicalRecordDeletePayload,
  isMedicalRecordUpdatePayload,
  isPendingMedicalRecordUpdateOperation,
  listOperations,
  subscribe,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import type { OfflineOperationStatus } from '@/offline/operations/types'
import {
  pendingMedicalRecordNumericId,
  pendingMedicalRecordToRecord,
  projectMedicalRecords,
  type ProjectedMedicalRecordCreate,
  type ProjectedMedicalRecordDelete,
  type ProjectedMedicalRecordUpdate,
} from '@/offline/projections/medical-records'
import { generateQueueId } from '@/offline/queue-core'
import { entityVersionFromRecord } from '@/offline/entity-version'
import { enqueuePendingMedicalRecordPhoto, enqueueUpload } from '@/lib/media-upload-queue'

const EMPTY_MEDICAL_RECORDS: MedicalRecord[] = []
const PROJECTABLE_OPERATION_STATUSES = new Set<OfflineOperationStatus>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

export type PendingMedicalRecordCreate = ProjectedMedicalRecordCreate
export type PendingMedicalRecordUpdate = ProjectedMedicalRecordUpdate & {
  operationId: string
}
export type PendingMedicalRecordDelete = ProjectedMedicalRecordDelete

export interface UseMedicalRecordsResult {
  items: MedicalRecord[]
  pendingCreates: PendingMedicalRecordCreate[]
  pendingUpdates: PendingMedicalRecordUpdate[]
  pendingDeletes: PendingMedicalRecordDelete[]
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

function operationToPendingMedicalRecord(
  operation: OfflineOperation
): PendingMedicalRecordCreate | null {
  if (!isMedicalRecordCreatePayload(operation.payload)) return null

  const { petId: _petId, ...createPayload } = operation.payload

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    status: operation.status,
    ...createPayload,
  }
}

function isProjectableMedicalRecordCreateOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'medical_record' &&
    operation.operation === 'create' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isMedicalRecordCreatePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

function isProjectableMedicalRecordUpdateOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'medical_record' &&
    operation.operation === 'update' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isMedicalRecordUpdatePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

function isProjectableMedicalRecordDeleteOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'medical_record' &&
    operation.operation === 'delete' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isMedicalRecordDeletePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

async function loadPendingMedicalRecordCreates(
  petId: number
): Promise<PendingMedicalRecordCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableMedicalRecordCreateOperation(operation, petId))
    .map((operation) => operationToPendingMedicalRecord(operation))
    .filter((pending): pending is PendingMedicalRecordCreate => pending !== null)
}

function operationToPendingMedicalRecordUpdate(
  operation: OfflineOperation
): PendingMedicalRecordUpdate | null {
  if (!isMedicalRecordUpdatePayload(operation.payload)) return null

  const { petId: _petId, recordId, ...updatePayload } = operation.payload

  return {
    operationId: operation.id,
    status: operation.status,
    recordId,
    ...updatePayload,
  }
}

async function loadPendingMedicalRecordUpdates(
  petId: number
): Promise<PendingMedicalRecordUpdate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableMedicalRecordUpdateOperation(operation, petId))
    .map((operation) => operationToPendingMedicalRecordUpdate(operation))
    .filter((pending): pending is PendingMedicalRecordUpdate => pending !== null)
}

function operationToPendingMedicalRecordDelete(
  operation: OfflineOperation
): PendingMedicalRecordDelete | null {
  if (!isMedicalRecordDeletePayload(operation.payload)) return null

  const { petId: _petId, recordId } = operation.payload

  return { recordId, status: operation.status }
}

async function loadPendingMedicalRecordDeletes(
  petId: number
): Promise<PendingMedicalRecordDelete[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableMedicalRecordDeleteOperation(operation, petId))
    .map((operation) => operationToPendingMedicalRecordDelete(operation))
    .filter((pending): pending is PendingMedicalRecordDelete => pending !== null)
}

async function findPendingMedicalRecordLocalId(
  petId: number,
  projectedRecordId: number
): Promise<string | null> {
  const operations = await listOperations()
  const createOperation = operations.find(
    (operation) =>
      isProjectableMedicalRecordCreateOperation(operation, petId) &&
      pendingMedicalRecordNumericId(operation.localEntityId ?? operation.id) === projectedRecordId
  )

  return createOperation?.localEntityId ?? createOperation?.id ?? null
}

export const MEDICAL_RECORD_ONLINE_ONLY_ERROR = 'This action requires an internet connection'

export const useMedicalRecords = (petId: number): UseMedicalRecordsResult => {
  const queryClient = useQueryClient()
  const isOnline = useNetworkStatus()
  const [page, setPage] = useState(1)
  const [recordTypeFilter, setRecordTypeFilter] = useState<string | undefined>(undefined)
  const [pendingCreates, setPendingCreates] = useState<PendingMedicalRecordCreate[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingMedicalRecordUpdate[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<PendingMedicalRecordDelete[]>([])

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
      setPendingUpdates([])
      setPendingDeletes([])
      return
    }

    let cancelled = false

    const refreshPendingOperations = async () => {
      const [nextPendingCreates, nextPendingUpdates, nextPendingDeletes] = await Promise.all([
        loadPendingMedicalRecordCreates(petId),
        loadPendingMedicalRecordUpdates(petId),
        loadPendingMedicalRecordDeletes(petId),
      ])
      if (!cancelled) {
        setPendingCreates(nextPendingCreates)
        setPendingUpdates(nextPendingUpdates)
        setPendingDeletes(nextPendingDeletes)
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

    const projected = projectMedicalRecords(
      serverItems,
      visiblePendingCreates,
      pendingUpdates,
      pendingDeletes,
      petId
    )

    if (recordTypeFilter === undefined) {
      return projected
    }

    return projected.filter((item) => item.record_type === recordTypeFilter)
  }, [pendingCreates, pendingUpdates, pendingDeletes, petId, recordTypeFilter, serverItems])

  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = isError ? 'Failed to load medical records' : null

  const invalidate = useCallback(() => {
    return invalidatePetMedicalRecords(queryClient, petId)
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
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableMedicalRecordCreateOperation(operation, petId) &&
              pendingMedicalRecordNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation && isMedicalRecordCreatePayload(createOperation.payload)) {
            const mergedPayload = {
              ...createOperation.payload,
              record_type: payload.record_type ?? createOperation.payload.record_type,
              description: payload.description ?? createOperation.payload.description,
              record_date: payload.record_date ?? createOperation.payload.record_date,
              vet_name:
                payload.vet_name !== undefined
                  ? payload.vet_name
                  : createOperation.payload.vet_name,
            }

            await updateOperation(createOperation.id, {
              status: 'pending',
              lastError: undefined,
              payload: mergedPayload,
            })

            return pendingMedicalRecordToRecord(
              {
                localEntityId: createOperation.localEntityId ?? createOperation.id,
                ...mergedPayload,
              },
              petId
            )
          }

          const existingPending = pendingCreates.find(
            (pending) => pendingMedicalRecordNumericId(pending.localEntityId) === id
          )

          return pendingMedicalRecordToRecord(
            {
              localEntityId: existingPending?.localEntityId ?? String(id),
              record_type: payload.record_type ?? existingPending?.record_type ?? '',
              description: payload.description ?? existingPending?.description ?? '',
              record_date: payload.record_date ?? existingPending?.record_date ?? '',
              vet_name:
                payload.vet_name !== undefined ? payload.vet_name : existingPending?.vet_name,
            },
            petId
          )
        }

        const idempotencyKey = generateQueueId()
        const existingItem = serverItems.find((item) => item.id === id)

        await enqueueOperation({
          idempotencyKey,
          entityType: 'medical_record',
          entityId: id,
          operation: 'update',
          baseVersion: entityVersionFromRecord(existingItem),
          payload: {
            petId,
            recordId: id,
            ...payload,
          },
        })

        return {
          id,
          pet_id: petId,
          record_type: payload.record_type ?? existingItem?.record_type ?? '',
          description: payload.description ?? existingItem?.description ?? '',
          record_date: payload.record_date ?? existingItem?.record_date ?? '',
          vet_name: payload.vet_name ?? existingItem?.vet_name ?? null,
          photos: existingItem?.photos ?? [],
          created_at: existingItem?.created_at,
          updated_at: existingItem?.updated_at,
        }
      }

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
    [updateMutation, petId, invalidate, isOnline, serverItems, isPendingCreate, pendingCreates]
  )

  const remove = useCallback(
    async (id: number) => {
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableMedicalRecordCreateOperation(operation, petId) &&
              pendingMedicalRecordNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation) {
            await removeOperation(createOperation.id)
          }

          return true
        }

        const operations = await listOperations()
        for (const operation of operations) {
          if (
            isPendingMedicalRecordUpdateOperation(operation, petId) &&
            isMedicalRecordUpdatePayload(operation.payload) &&
            operation.payload.recordId === id
          ) {
            await removeOperation(operation.id)
          }
        }

        if (
          operations.some(
            (operation) =>
              isActiveMedicalRecordDeleteOperation(operation, petId) &&
              isMedicalRecordDeletePayload(operation.payload) &&
              operation.payload.recordId === id
          )
        ) {
          return true
        }

        const idempotencyKey = generateQueueId()

        await enqueueOperation({
          idempotencyKey,
          entityType: 'medical_record',
          entityId: id,
          operation: 'delete',
          payload: {
            petId,
            recordId: id,
          },
        })

        return true
      }

      await deleteMutation.mutateAsync({ pet: petId, record: id })
      await invalidate()
      return true
    },
    [deleteMutation, petId, invalidate, isOnline, isPendingCreate]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File) => {
      if (!isOnline) {
        const localRecordId = await findPendingMedicalRecordLocalId(petId, recordId)
        if (localRecordId) {
          await enqueuePendingMedicalRecordPhoto({
            petId,
            localRecordId,
            file,
          })
        } else {
          await enqueueUpload({
            target: {
              kind: 'medical-photo',
              petId,
              recordId,
            },
            file,
          })
        }

        const existingRecord = items.find((item) => item.id === recordId)
        return (
          existingRecord ?? {
            id: recordId,
            pet_id: petId,
            photos: [],
          }
        )
      }

      const updatedRecord = await uploadPhotoMutation.mutateAsync({
        pet: petId,
        record: recordId,
        data: { photo: file },
      })
      await invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate, isOnline, items]
  )

  const deletePhoto = useCallback(
    async (recordId: number, photoId: number) => {
      if (!isOnline) {
        throw new Error(MEDICAL_RECORD_ONLINE_ONLY_ERROR)
      }
      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId, photo: photoId })
      await invalidate()
    },
    [deletePhotoMutation, petId, invalidate, isOnline]
  )

  return useMemo(
    () => ({
      items,
      pendingCreates,
      pendingUpdates,
      pendingDeletes,
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
      pendingUpdates,
      pendingDeletes,
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
