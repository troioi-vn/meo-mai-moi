import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetWeights,
  usePostPetsPetWeights,
  usePutPetsPetWeightsWeight,
  useDeletePetsPetWeightsWeight,
  getGetPetsPetWeightsQueryKey,
} from '@/api/generated/pets/pets'
import type { WeightHistory } from '@/api/generated/model'
import { useAuth } from '@/hooks/use-auth'
import { useNetworkStatus } from '@/hooks/use-network-status'
import {
  enqueueOperation,
  listOperations,
  subscribe,
  type OfflineOperation,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

const EMPTY_WEIGHT_HISTORY: WeightHistory[] = []

export interface WeightCreatePayload {
  weight_kg: number
  record_date: string
  tare_weight_kg?: number | null
}

export type PendingWeightCreate = WeightCreatePayload & {
  localEntityId: string
}

export interface WeightUpdatePayload {
  weight_kg?: number
  record_date?: string
  tare_weight_kg?: number | null
}

export type PendingWeightUpdate = WeightUpdatePayload & {
  weightId: number
  operationId: string
}

export interface UseWeightsResult {
  items: WeightHistory[]
  pendingCreates: PendingWeightCreate[]
  pendingUpdates: PendingWeightUpdate[]
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

function isWeightCreatePayload(payload: unknown): payload is WeightCreatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as WeightCreatePayload
  return (
    typeof candidate.weight_kg === 'number' &&
    typeof candidate.record_date === 'string' &&
    candidate.record_date.length > 0
  )
}

function isPendingWeightCreateOperation(operation: OfflineOperation, petId: number): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'create' &&
    String(operation.entityId) === String(petId) &&
    operation.status === 'pending'
  )
}

function isPendingWeightUpdateOperation(operation: OfflineOperation, petId: number): boolean {
  if (
    operation.entityType !== 'weight' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (!operation.payload || typeof operation.payload !== 'object') {
    return false
  }

  const payload = operation.payload as { petId?: unknown }
  return String(payload.petId) === String(petId)
}

function isWeightUpdateOperationPayload(
  payload: unknown
): payload is WeightUpdatePayload & { petId: number; weightId: number } {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as WeightUpdatePayload & { petId?: unknown; weightId?: unknown }
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    typeof candidate.weightId === 'number' &&
    Number.isFinite(candidate.weightId)
  )
}

function operationToPendingWeightUpdate(operation: OfflineOperation): PendingWeightUpdate | null {
  if (!isWeightUpdateOperationPayload(operation.payload)) return null

  const { petId: _petId, weightId, ...updatePayload } = operation.payload

  return {
    operationId: operation.id,
    weightId,
    ...updatePayload,
  }
}

function applyPendingUpdates(
  items: WeightHistory[],
  pendingUpdates: PendingWeightUpdate[]
): WeightHistory[] {
  if (pendingUpdates.length === 0) {
    return items
  }

  const updatesByWeightId = new Map<number, PendingWeightUpdate>()
  for (const pendingUpdate of pendingUpdates) {
    updatesByWeightId.set(pendingUpdate.weightId, pendingUpdate)
  }

  return items.map((item) => {
    if (item.id == null) {
      return item
    }

    const pendingUpdate = updatesByWeightId.get(item.id)
    if (!pendingUpdate) {
      return item
    }

    return {
      ...item,
      ...(pendingUpdate.weight_kg !== undefined ? { weight_kg: pendingUpdate.weight_kg } : {}),
      ...(pendingUpdate.record_date !== undefined
        ? { record_date: pendingUpdate.record_date }
        : {}),
    }
  })
}

function operationToPendingWeight(operation: OfflineOperation): PendingWeightCreate | null {
  if (!isWeightCreatePayload(operation.payload)) return null

  return {
    localEntityId: operation.localEntityId ?? operation.id,
    weight_kg: operation.payload.weight_kg,
    record_date: operation.payload.record_date,
    tare_weight_kg: operation.payload.tare_weight_kg,
  }
}

export function pendingWeightNumericId(localEntityId: string): number {
  let hash = 0
  for (let index = 0; index < localEntityId.length; index++) {
    hash = (Math.imul(31, hash) + localEntityId.charCodeAt(index)) | 0
  }

  if (hash === 0) return -1

  return hash > 0 ? -hash : hash
}

function pendingWeightToHistory(pending: PendingWeightCreate, petId: number): WeightHistory {
  return {
    id: pendingWeightNumericId(pending.localEntityId),
    pet_id: petId,
    weight_kg: pending.weight_kg,
    record_date: pending.record_date,
  }
}

async function loadPendingWeightCreates(petId: number): Promise<PendingWeightCreate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isPendingWeightCreateOperation(operation, petId))
    .map((operation) => operationToPendingWeight(operation))
    .filter((pending): pending is PendingWeightCreate => pending !== null)
}

async function loadPendingWeightUpdates(petId: number): Promise<PendingWeightUpdate[]> {
  const operations = await listOperations()

  return operations
    .filter((operation) => isPendingWeightUpdateOperation(operation, petId))
    .map((operation) => operationToPendingWeightUpdate(operation))
    .filter((pending): pending is PendingWeightUpdate => pending !== null)
}

export const useWeights = (petId: number): UseWeightsResult => {
  const queryClient = useQueryClient()
  const { loadUser } = useAuth()
  const isOnline = useNetworkStatus()
  const [page, setPage] = useState(1)
  const [pendingCreates, setPendingCreates] = useState<PendingWeightCreate[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<PendingWeightUpdate[]>([])

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
      return
    }

    let cancelled = false

    const refreshPendingOperations = async () => {
      const [nextPendingCreates, nextPendingUpdates] = await Promise.all([
        loadPendingWeightCreates(petId),
        loadPendingWeightUpdates(petId),
      ])
      if (!cancelled) {
        setPendingCreates(nextPendingCreates)
        setPendingUpdates(nextPendingUpdates)
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
  const items = useMemo(() => {
    const pendingItems = pendingCreates.map((pending) => pendingWeightToHistory(pending, petId))
    const mergedServerItems = applyPendingUpdates(serverItems, pendingUpdates)

    return [...pendingItems, ...mergedServerItems]
  }, [pendingCreates, pendingUpdates, petId, serverItems])

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
    return queryClient.invalidateQueries({
      queryKey: getGetPetsPetWeightsQueryKey(petId),
    })
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
    [updateMutation, petId, invalidate, loadUser, isOnline, serverItems]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, weight: id })
      await invalidate()
      return true
    },
    [deleteMutation, petId, invalidate]
  )

  return useMemo(
    () => ({
      items,
      pendingCreates,
      pendingUpdates,
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
