import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetWeights,
  usePostPetsPetWeights,
  usePutPetsPetWeightsWeight,
  useDeletePetsPetWeightsWeight,
} from '@/api/generated/pets/pets'
import type { WeightHistory } from '@/api/generated/model'
import { useAuth } from '@/hooks/use-auth'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { invalidatePetWeights } from '@/lib/health-record-cache'
import {
  enqueueOperation,
  isActiveWeightDeleteOperation,
  isPendingWeightUpdateOperation,
  isWeightCreatePayload,
  isWeightDeletePayload,
  isWeightUpdatePayload,
  listOperations,
  removeOperation,
  subscribe,
  updateOperation,
  type OfflineOperation,
  type WeightCreatePayload,
  type WeightDeletePayload,
  type WeightUpdatePayload,
} from '@/offline/operations'
import type { OfflineOperationStatus } from '@/offline/operations/types'
import {
  pendingWeightNumericId,
  pendingWeightToHistory,
  projectWeightHistory,
  type ProjectedWeightCreate,
  type ProjectedWeightDelete,
  type ProjectedWeightUpdate,
} from '@/offline/projections'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_WEIGHT_HISTORY: WeightHistory[] = []
const PROJECTABLE_OPERATION_STATUSES = new Set<OfflineOperationStatus>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

export type { WeightCreatePayload, WeightDeletePayload, WeightUpdatePayload }

export { pendingWeightNumericId }

export type PendingWeightCreate = ProjectedWeightCreate

export type PendingWeightUpdate = Omit<ProjectedWeightUpdate, 'weightId'> & {
  operationId: string
  weightId: number
}

export type PendingWeightDelete = ProjectedWeightDelete

export interface UseWeightsResult {
  items: WeightHistory[]
  pendingCreates: PendingWeightCreate[]
  pendingUpdates: PendingWeightUpdate[]
  pendingDeletes: PendingWeightDelete[]
  isPendingCreate: (id: number) => boolean
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  refresh: (page?: number) => Promise<void>
  create: (payload: WeightCreatePayload) => Promise<WeightHistory>
  update: (
    id: number,
    payload: Partial<{
      weight_kg: number
      record_date: string
      tare_weight_kg: number | null
    }>
  ) => Promise<WeightHistory>
  remove: (id: number) => Promise<boolean>
}

function operationToPendingWeightUpdate(operation: OfflineOperation): PendingWeightUpdate | null {
  if (!isWeightUpdatePayload(operation.payload)) return null

  const { petId: _petId, weightId, ...updatePayload } = operation.payload

  return {
    operationId: operation.id,
    status: operation.status,
    weightId,
    ...updatePayload,
  }
}

function operationToPendingWeight(operation: OfflineOperation): PendingWeightCreate | null {
  if (!isWeightCreatePayload(operation.payload)) return null

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    status: operation.status,
    weight_kg: operation.payload.weight_kg,
    record_date: operation.payload.record_date,
    tare_weight_kg: operation.payload.tare_weight_kg,
  }
}

function isProjectableWeightCreateOperation(operation: OfflineOperation, petId: number): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'create' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    String(operation.entityId) === String(petId)
  )
}

function isProjectableWeightUpdateOperation(operation: OfflineOperation, petId: number): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'update' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isWeightUpdatePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

function isProjectableWeightDeleteOperation(operation: OfflineOperation, petId: number): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'delete' &&
    PROJECTABLE_OPERATION_STATUSES.has(operation.status) &&
    isWeightDeletePayload(operation.payload) &&
    String(operation.payload.petId) === String(petId)
  )
}

async function loadPendingWeightCreates(petId: number): Promise<PendingWeightCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableWeightCreateOperation(operation, petId))
    .map((operation) => operationToPendingWeight(operation))
    .filter((pending): pending is PendingWeightCreate => pending !== null)
}

async function loadPendingWeightUpdates(petId: number): Promise<PendingWeightUpdate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableWeightUpdateOperation(operation, petId))
    .map((operation) => operationToPendingWeightUpdate(operation))
    .filter((pending): pending is PendingWeightUpdate => pending !== null)
}

function operationToPendingWeightDelete(operation: OfflineOperation): PendingWeightDelete | null {
  if (!isWeightDeletePayload(operation.payload)) return null

  const { petId: _petId, weightId } = operation.payload

  return { weightId, status: operation.status }
}

async function loadPendingWeightDeletes(petId: number): Promise<PendingWeightDelete[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isProjectableWeightDeleteOperation(operation, petId))
    .map((operation) => operationToPendingWeightDelete(operation))
    .filter((pending): pending is PendingWeightDelete => pending !== null)
}

export const useWeights = (petId: number): UseWeightsResult => {
  const queryClient = useQueryClient()
  const { loadUser } = useAuth()
  const isOnline = useNetworkStatus()
  const [page, setPage] = useState(1)
  const [pendingCreates, setPendingCreates] = useState<PendingWeightCreate[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingWeightUpdate[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<PendingWeightDelete[]>([])

  const params = { page }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetWeights(petId, params, {
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
        loadPendingWeightCreates(petId),
        loadPendingWeightUpdates(petId),
        loadPendingWeightDeletes(petId),
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

  const serverItems = useMemo(() => queryData?.data ?? EMPTY_WEIGHT_HISTORY, [queryData])
  const items = useMemo(
    () => projectWeightHistory(serverItems, pendingCreates, pendingUpdates, pendingDeletes, petId),
    [pendingCreates, pendingUpdates, pendingDeletes, petId, serverItems]
  )

  const pendingCreateIds = useMemo(
    () => new Set(pendingCreates.map((pending) => pendingWeightNumericId(pending.localEntityId))),
    [pendingCreates]
  )

  const isPendingCreate = useCallback((id: number) => pendingCreateIds.has(id), [pendingCreateIds])

  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = isError ? 'Failed to load weights' : null

  const invalidate = useCallback(() => {
    return invalidatePetWeights(queryClient, petId)
  }, [queryClient, petId])

  const createMutation = usePostPetsPetWeights()
  const updateMutation = usePutPetsPetWeightsWeight()
  const deleteMutation = useDeletePetsPetWeightsWeight()

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg)
      await invalidate()
    },
    [invalidate]
  )

  const create = useCallback(
    async (payload: WeightCreatePayload) => {
      if (!isOnline) {
        const localEntityId = generateQueueId()

        await enqueueOperation({
          idempotencyKey: localEntityId,
          entityType: 'weight',
          entityId: petId,
          operation: 'create',
          localEntityId,
          payload,
        })

        setPage(1)

        const pending: PendingWeightCreate = {
          localEntityId,
          ...payload,
        }

        return pendingWeightToHistory(pending, petId)
      }

      const item = await createMutation.mutateAsync({
        pet: petId,
        data: payload,
      })
      setPage(1)
      await invalidate()
      if (payload.tare_weight_kg != null) {
        await loadUser()
      }
      return item
    },
    [createMutation, petId, invalidate, loadUser, isOnline]
  )

  const updateOne = useCallback(
    async (
      id: number,
      payload: Partial<{
        weight_kg: number
        record_date: string
        tare_weight_kg: number | null
      }>
    ) => {
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableWeightCreateOperation(operation, petId) &&
              pendingWeightNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation && isWeightCreatePayload(createOperation.payload)) {
            const mergedPayload: WeightCreatePayload = {
              ...createOperation.payload,
              weight_kg: payload.weight_kg ?? createOperation.payload.weight_kg,
              record_date: payload.record_date ?? createOperation.payload.record_date,
              tare_weight_kg:
                payload.tare_weight_kg !== undefined
                  ? payload.tare_weight_kg
                  : createOperation.payload.tare_weight_kg,
            }

            await updateOperation(createOperation.id, {
              status: 'pending',
              lastError: undefined,
              payload: mergedPayload,
            })

            return {
              id,
              pet_id: petId,
              weight_kg: mergedPayload.weight_kg,
              record_date: mergedPayload.record_date,
            }
          }

          const existingPending = pendingCreates.find(
            (pending) => pendingWeightNumericId(pending.localEntityId) === id
          )

          return pendingWeightToHistory(
            {
              localEntityId: existingPending?.localEntityId ?? String(id),
              weight_kg: payload.weight_kg ?? existingPending?.weight_kg ?? 0,
              record_date: payload.record_date ?? existingPending?.record_date ?? '',
              tare_weight_kg:
                payload.tare_weight_kg !== undefined
                  ? payload.tare_weight_kg
                  : existingPending?.tare_weight_kg,
            },
            petId
          )
        }

        const idempotencyKey = generateQueueId()

        await enqueueOperation({
          idempotencyKey,
          entityType: 'weight',
          entityId: id,
          operation: 'update',
          payload: {
            petId,
            weightId: id,
            ...payload,
          },
        })

        const existingItem = serverItems.find((item) => item.id === id)
        const projectedItem: WeightHistory = {
          id,
          pet_id: petId,
          weight_kg: payload.weight_kg ?? existingItem?.weight_kg ?? 0,
          record_date: payload.record_date ?? existingItem?.record_date ?? '',
        }

        return projectedItem
      }

      const item = await updateMutation.mutateAsync({
        pet: petId,
        weight: id,
        data: payload,
      })
      await invalidate()
      if (payload.tare_weight_kg != null) {
        await loadUser()
      }
      return item
    },
    [
      updateMutation,
      petId,
      invalidate,
      loadUser,
      isOnline,
      serverItems,
      isPendingCreate,
      pendingCreates,
    ]
  )

  const remove = useCallback(
    async (id: number) => {
      if (!isOnline) {
        if (isPendingCreate(id)) {
          const operations = await listOperations()
          const createOperation = operations.find(
            (operation) =>
              isProjectableWeightCreateOperation(operation, petId) &&
              pendingWeightNumericId(operation.localEntityId ?? operation.id) === id
          )

          if (createOperation) {
            await removeOperation(createOperation.id)
          }

          return true
        }

        const operations = await listOperations()
        for (const operation of operations) {
          if (
            isPendingWeightUpdateOperation(operation, petId) &&
            isWeightUpdatePayload(operation.payload) &&
            operation.payload.weightId === id
          ) {
            await removeOperation(operation.id)
          }
        }

        if (
          operations.some(
            (operation) =>
              isActiveWeightDeleteOperation(operation, petId) &&
              isWeightDeletePayload(operation.payload) &&
              operation.payload.weightId === id
          )
        ) {
          return true
        }

        const idempotencyKey = generateQueueId()

        await enqueueOperation({
          idempotencyKey,
          entityType: 'weight',
          entityId: id,
          operation: 'delete',
          payload: {
            petId,
            weightId: id,
          },
        })

        return true
      }

      await deleteMutation.mutateAsync({ pet: petId, weight: id })
      await invalidate()
      return true
    },
    [deleteMutation, petId, invalidate, isOnline, isPendingCreate]
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
      refresh,
      create,
      update: updateOne,
      remove,
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
      refresh,
      create,
      updateOne,
      remove,
    ]
  )
}
