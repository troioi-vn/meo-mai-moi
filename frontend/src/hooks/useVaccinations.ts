import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetVaccinations,
  usePostPetsPetVaccinations,
  usePutPetsPetVaccinationsRecord,
  useDeletePetsPetVaccinationsRecord,
  usePostPetsPetVaccinationsRecordRenew,
  usePostPetsPetVaccinationsRecordPhoto,
  useDeletePetsPetVaccinationsRecordPhoto,
} from '@/api/generated/pets/pets'
import type { VaccinationRecord } from '@/api/generated/model'
import type { GetPetsPetVaccinationsStatus as VaccinationStatus } from '@/api/generated/model'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { invalidatePetVaccinations } from '@/lib/health-record-cache'
import {
  enqueueOperation,
  isActiveVaccinationDeleteOperation,
  isPendingVaccinationUpdateOperation,
  isVaccinationCreatePayload,
  isVaccinationDeletePayload,
  isVaccinationUpdatePayload,
  listOperations,
  removeOperation,
  subscribe,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import type { OfflineOperationStatus } from '@/offline/operations/types'
import {
  pendingVaccinationNumericId,
  pendingVaccinationToRecord,
  projectVaccinations,
  type ProjectedVaccinationCreate,
  type ProjectedVaccinationDelete,
  type ProjectedVaccinationUpdate,
} from '@/offline/projections'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_VACCINATION_RECORDS: VaccinationRecord[] = []
const PROJECTABLE_OPERATION_STATUSES = new Set<OfflineOperationStatus>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

export const VACCINATION_ONLINE_ONLY_ERROR = 'This action requires an internet connection'

export type PendingVaccinationCreate = ProjectedVaccinationCreate

export type PendingVaccinationUpdate = ProjectedVaccinationUpdate & {
  operationId: string
}

export type PendingVaccinationDelete = ProjectedVaccinationDelete

export interface UseVaccinationsResult {
  items: VaccinationRecord[]
  pendingCreates: PendingVaccinationCreate[]
  pendingUpdates: PendingVaccinationUpdate[]
  pendingDeletes: PendingVaccinationDelete[]
  isPendingCreate: (id: number) => boolean
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

function operationToPendingVaccination(
  operation: OfflineOperation
): PendingVaccinationCreate | null {
  if (!isVaccinationCreatePayload(operation.payload)) return null

  const { petId: _petId, ...createPayload } = operation.payload

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    status: operation.status,
    ...createPayload,
  }
}

function operationToPendingVaccinationUpdate(
  operation: OfflineOperation
): PendingVaccinationUpdate | null {
  if (!isVaccinationUpdatePayload(operation.payload)) return null

  const { petId: _petId, recordId, ...updatePayload } = operation.payload

  return {
    operationId: operation.id,
    status: operation.status,
    recordId,
    ...updatePayload,
  }
}

function operationToPendingVaccinationDelete(
  operation: OfflineOperation
): PendingVaccinationDelete | null {
  if (!isVaccinationDeletePayload(operation.payload)) return null

  const { petId: _petId, recordId } = operation.payload

  return { recordId, status: operation.status }
}

function isProjectableVaccinationCreateOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'vaccination' &&
    operation.operation === 'create' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isVaccinationCreatePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

function isProjectableVaccinationUpdateOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'vaccination' &&
    operation.operation === 'update' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isVaccinationUpdatePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

function isProjectableVaccinationDeleteOperation(
  operation: OfflineOperation,
  petId: number
): boolean {
  return (
    operation.entityType === 'vaccination' &&
    operation.operation === 'delete' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isVaccinationDeletePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

async function loadPendingVaccinationCreates(petId: number): Promise<PendingVaccinationCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableVaccinationCreateOperation(operation, petId))
    .map((operation) => operationToPendingVaccination(operation))
    .filter((pending): pending is PendingVaccinationCreate => pending !== null)
}

async function loadPendingVaccinationUpdates(petId: number): Promise<PendingVaccinationUpdate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableVaccinationUpdateOperation(operation, petId))
    .map((operation) => operationToPendingVaccinationUpdate(operation))
    .filter((pending): pending is PendingVaccinationUpdate => pending !== null)
}

async function loadPendingVaccinationDeletes(petId: number): Promise<PendingVaccinationDelete[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableVaccinationDeleteOperation(operation, petId))
    .map((operation) => operationToPendingVaccinationDelete(operation))
    .filter((pending): pending is PendingVaccinationDelete => pending !== null)
}

export const useVaccinations = (
  petId: number,
  initialStatus: VaccinationStatus = 'active'
): UseVaccinationsResult => {
  const queryClient = useQueryClient()
  const isOnline = useNetworkStatus()
  const [status, setStatus] = useState<VaccinationStatus>(initialStatus)
  const [pendingCreates, setPendingCreates] = useState<PendingVaccinationCreate[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingVaccinationUpdate[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<PendingVaccinationDelete[]>([])

  const params = { page: 1, status }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetVaccinations(petId, params, {
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
        loadPendingVaccinationCreates(petId),
        loadPendingVaccinationUpdates(petId),
        loadPendingVaccinationDeletes(petId),
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

  const serverItems = useMemo(() => queryData?.data ?? EMPTY_VACCINATION_RECORDS, [queryData])
  const items = useMemo(() => {
    return projectVaccinations(serverItems, pendingCreates, pendingUpdates, pendingDeletes, petId, {
      includePendingCreates: status === 'active' || status === 'all',
    })
  }, [pendingCreates, pendingUpdates, pendingDeletes, petId, serverItems, status])

  const pendingCreateIds = useMemo(
    () =>
      new Set(pendingCreates.map((pending) => pendingVaccinationNumericId(pending.localEntityId))),
    [pendingCreates]
  )

  const isPendingCreate = useCallback((id: number) => pendingCreateIds.has(id), [pendingCreateIds])

  const loading = isLoading
  const error = isError ? 'Failed to load vaccinations' : null

  const invalidate = useCallback(() => {
    return invalidatePetVaccinations(queryClient, petId)
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
      if (!isOnline) {
        const localEntityId = generateQueueId()

        await enqueueOperation({
          idempotencyKey: localEntityId,
          entityType: 'vaccination',
          entityId: petId,
          operation: 'create',
          localEntityId,
          payload: {
            petId,
            vaccine_name: payload.vaccine_name,
            administered_at: payload.administered_at,
            due_at: payload.due_at ?? null,
            notes: payload.notes ?? null,
          },
        })

        const pending: PendingVaccinationCreate = {
          localEntityId,
          vaccine_name: payload.vaccine_name,
          administered_at: payload.administered_at,
          due_at: payload.due_at ?? null,
          notes: payload.notes ?? null,
        }

        return pendingVaccinationToRecord(pending, petId)
      }

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
    [createMutation, petId, invalidate, isOnline]
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
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableVaccinationCreateOperation(operation, petId) &&
              pendingVaccinationNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation && isVaccinationCreatePayload(createOperation.payload)) {
            await updateOperation(createOperation.id, {
              status: 'pending',
              lastError: undefined,
              payload: {
                ...createOperation.payload,
                vaccine_name: payload.vaccine_name ?? createOperation.payload.vaccine_name,
                administered_at: payload.administered_at ?? createOperation.payload.administered_at,
                due_at:
                  payload.due_at !== undefined ? payload.due_at : createOperation.payload.due_at,
                notes: payload.notes !== undefined ? payload.notes : createOperation.payload.notes,
              },
            })
          }

          return
        }

        const idempotencyKey = generateQueueId()

        await enqueueOperation({
          idempotencyKey,
          entityType: 'vaccination',
          entityId: id,
          operation: 'update',
          payload: {
            petId,
            recordId: id,
            ...payload,
          },
        })

        return
      }

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
    [updateMutation, petId, invalidate, isOnline, isPendingCreate]
  )

  const remove = useCallback(
    async (id: number) => {
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableVaccinationCreateOperation(operation, petId) &&
              pendingVaccinationNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation) {
            await removeOperation(createOperation.id)
          }

          return
        }

        const operations = await listOperations()
        for (const operation of operations) {
          if (
            isPendingVaccinationUpdateOperation(operation, petId) &&
            isVaccinationUpdatePayload(operation.payload) &&
            operation.payload.recordId === id
          ) {
            await removeOperation(operation.id)
          }
        }

        if (
          operations.some(
            (operation) =>
              isActiveVaccinationDeleteOperation(operation, petId) &&
              isVaccinationDeletePayload(operation.payload) &&
              operation.payload.recordId === id
          )
        ) {
          return
        }

        const idempotencyKey = generateQueueId()

        await enqueueOperation({
          idempotencyKey,
          entityType: 'vaccination',
          entityId: id,
          operation: 'delete',
          payload: {
            petId,
            recordId: id,
          },
        })

        return
      }

      await deleteMutation.mutateAsync({ pet: petId, record: id })
      await invalidate()
    },
    [deleteMutation, petId, invalidate, isOnline, isPendingCreate]
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
      if (!isOnline) {
        throw new Error(VACCINATION_ONLINE_ONLY_ERROR)
      }

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
    [renewMutation, petId, invalidate, isOnline]
  )

  const uploadPhoto = useCallback(
    async (recordId: number, file: File): Promise<VaccinationRecord> => {
      if (!isOnline) {
        throw new Error(VACCINATION_ONLINE_ONLY_ERROR)
      }

      const updatedRecord = await uploadPhotoMutation.mutateAsync({
        pet: petId,
        record: recordId,
        data: { photo: file },
      })
      await invalidate()
      return updatedRecord
    },
    [uploadPhotoMutation, petId, invalidate, isOnline]
  )

  const deletePhoto = useCallback(
    async (recordId: number): Promise<void> => {
      if (!isOnline) {
        throw new Error(VACCINATION_ONLINE_ONLY_ERROR)
      }

      await deletePhotoMutation.mutateAsync({ pet: petId, record: recordId })
      await invalidate()
    },
    [deletePhotoMutation, petId, invalidate, isOnline]
  )

  return {
    items,
    pendingCreates,
    pendingUpdates,
    pendingDeletes,
    isPendingCreate,
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
