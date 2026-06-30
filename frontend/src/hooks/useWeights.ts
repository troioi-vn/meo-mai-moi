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

export interface UseWeightsResult {
  items: WeightHistory[]
  pendingCreates: PendingWeightCreate[]
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

export const useWeights = (petId: number): UseWeightsResult => {
  const queryClient = useQueryClient()
  const { loadUser } = useAuth()
  const isOnline = useNetworkStatus()
  const [page, setPage] = useState(1)
  const [pendingCreates, setPendingCreates] = useState<PendingWeightCreate[]>([])

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
      return
    }

    let cancelled = false

    const refreshPendingCreates = async () => {
      const nextPendingCreates = await loadPendingWeightCreates(petId)
      if (!cancelled) {
        setPendingCreates(nextPendingCreates)
      }
    }

    void refreshPendingCreates()

    const unsubscribe = subscribe(() => {
      void refreshPendingCreates()
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [petId])

  const serverItems = useMemo(() => queryData?.data ?? EMPTY_WEIGHT_HISTORY, [queryData])
  const items = useMemo(() => {
    const pendingItems = pendingCreates.map((pending) => pendingWeightToHistory(pending, petId))

    return [...pendingItems, ...serverItems]
  }, [pendingCreates, petId, serverItems])

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
    [updateMutation, petId, invalidate, loadUser]
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
