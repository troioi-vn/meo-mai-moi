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
  getGetPetsPetVaccinationsQueryKey,
} from '@/api/generated/pets/pets'
import type { VaccinationRecord } from '@/api/generated/model'
import type { GetPetsPetVaccinationsStatus as VaccinationStatus } from '@/api/generated/model'
import { useNetworkStatus } from '@/hooks/use-network-status'
import {
  enqueueOperation,
  isActiveVaccinationDeleteOperation,
  isActiveVaccinationUpdateOperation,
  isPendingVaccinationCreateOperation,
  isPendingVaccinationUpdateOperation,
  isVaccinationCreatePayload,
  isVaccinationDeletePayload,
  isVaccinationUpdatePayload,
  listOperations,
  removeOperation,
  subscribe,
  updateOperation,
  type OfflineOperation,
  type VaccinationCreatePayload,
  type VaccinationDeletePayload,
  type VaccinationUpdatePayload,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_VACCINATION_RECORDS: VaccinationRecord[] = []

export type PendingVaccinationCreate = Omit<VaccinationCreatePayload, 'petId'> & {
  localEntityId: string
}

export type PendingVaccinationUpdate = Omit<VaccinationUpdatePayload, 'petId'> & {
  operationId: string
}

export type PendingVaccinationDelete = Omit<VaccinationDeletePayload, 'petId'>

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

function pendingVaccinationNumericId(localEntityId: string): number {
  let hash = 0
  for (let index = 0; index < localEntityId.length; index++) {
    hash = (Math.imul(31, hash) + localEntityId.charCodeAt(index)) | 0
  }

  if (hash === 0) return -1

  return hash > 0 ? -hash : hash
}

function operationToPendingVaccination(
  operation: OfflineOperation
): PendingVaccinationCreate | null {
  if (!isVaccinationCreatePayload(operation.payload)) return null

  const { petId: _petId, ...createPayload } = operation.payload

  return {
    localEntityId: operation.localEntityId ?? operation.id,
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
    recordId,
    ...updatePayload,
  }
}

function operationToPendingVaccinationDelete(
  operation: OfflineOperation
): PendingVaccinationDelete | null {
  if (!isVaccinationDeletePayload(operation.payload)) return null

  const { petId: _petId, recordId } = operation.payload

  return { recordId }
}

function pendingVaccinationToRecord(
  pending: PendingVaccinationCreate,
  petId: number
): VaccinationRecord {
  return {
    id: pendingVaccinationNumericId(pending.localEntityId),
    pet_id: petId,
    vaccine_name: pending.vaccine_name,
    administered_at: pending.administered_at,
    due_at: pending.due_at ?? undefined,
    notes: pending.notes ?? undefined,
    completed_at: null,
    photo_url: null,
  }
}

function applyPendingUpdates(
  items: VaccinationRecord[],
  pendingUpdates: PendingVaccinationUpdate[]
): VaccinationRecord[] {
  if (pendingUpdates.length === 0) {
    return items
  }

  const updatesByRecordId = new Map<number, PendingVaccinationUpdate>()
  for (const pendingUpdate of pendingUpdates) {
    updatesByRecordId.set(pendingUpdate.recordId, pendingUpdate)
  }

  return items.map((item) => {
    if (item.id == null) {
      return item
    }

    const pendingUpdate = updatesByRecordId.get(item.id)
    if (!pendingUpdate) {
      return item
    }

    return {
      ...item,
      ...(pendingUpdate.vaccine_name !== undefined
        ? { vaccine_name: pendingUpdate.vaccine_name }
        : {}),
      ...(pendingUpdate.administered_at !== undefined
        ? { administered_at: pendingUpdate.administered_at }
        : {}),
      ...(pendingUpdate.due_at !== undefined ? { due_at: pendingUpdate.due_at ?? undefined } : {}),
      ...(pendingUpdate.notes !== undefined ? { notes: pendingUpdate.notes ?? undefined } : {}),
    }
  })
}

function applyPendingDeletes(
  items: VaccinationRecord[],
  pendingDeletes: PendingVaccinationDelete[]
): VaccinationRecord[] {
  if (pendingDeletes.length === 0) {
    return items
  }

  const deletedRecordIds = new Set(pendingDeletes.map((pendingDelete) => pendingDelete.recordId))

  return items.filter((item) => item.id == null || !deletedRecordIds.has(item.id))
}

async function loadPendingVaccinationCreates(petId: number): Promise<PendingVaccinationCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isPendingVaccinationCreateOperation(operation, petId))
    .map((operation) => operationToPendingVaccination(operation))
    .filter((pending): pending is PendingVaccinationCreate => pending !== null)
}

async function loadPendingVaccinationUpdates(petId: number): Promise<PendingVaccinationUpdate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isActiveVaccinationUpdateOperation(operation, petId))
    .map((operation) => operationToPendingVaccinationUpdate(operation))
    .filter((pending): pending is PendingVaccinationUpdate => pending !== null)
}

async function loadPendingVaccinationDeletes(petId: number): Promise<PendingVaccinationDelete[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isActiveVaccinationDeleteOperation(operation, petId))
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
    let mergedItems = serverItems

    if (status === 'active' || status === 'all') {
      const pendingItems = pendingCreates.map((pending) =>
        pendingVaccinationToRecord(pending, petId)
      )
      mergedItems = [...pendingItems, ...mergedItems]
    }

    return applyPendingDeletes(applyPendingUpdates(mergedItems, pendingUpdates), pendingDeletes)
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
              isPendingVaccinationCreateOperation(operation, petId) &&
              pendingVaccinationNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation && isVaccinationCreatePayload(createOperation.payload)) {
            await updateOperation(createOperation.id, {
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
              isPendingVaccinationCreateOperation(operation, petId) &&
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
