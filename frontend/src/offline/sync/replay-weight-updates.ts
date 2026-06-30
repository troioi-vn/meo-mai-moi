import { onlineManager, type QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { WeightHistory } from '@/api/generated/model'
import { getGetPetsPetWeightsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import {
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus, isRetryableHttpError } from '@/offline/queue-core'

let replaying = false

export interface WeightUpdateReplayPayload {
  petId: number
  weightId: number
  weight_kg?: number
  record_date?: string
  tare_weight_kg?: number | null
}

function isPendingWeightUpdateOperation(operation: OfflineOperation): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'update' &&
    operation.status === 'pending'
  )
}

function isWeightUpdatePayload(payload: unknown): payload is WeightUpdateReplayPayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as WeightUpdateReplayPayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.weightId === 'number' &&
    Number.isFinite(candidate.weightId) &&
    candidate.weightId > 0
  )
}

function updateBodyFromPayload(payload: WeightUpdateReplayPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (payload.weight_kg !== undefined) {
    body.weight_kg = payload.weight_kg
  }
  if (payload.record_date !== undefined) {
    body.record_date = payload.record_date
  }
  if (payload.tare_weight_kg !== undefined) {
    body.tare_weight_kg = payload.tare_weight_kg
  }

  return body
}

function operationErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data
    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const message = (responseData as { message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) {
        return message
      }
    }

    return error.message
  }

  return error instanceof Error ? error.message : 'Unknown error'
}

function isRetryableOperationError(error: unknown): boolean {
  if (axios.isAxiosError(error) && !error.response) {
    return true
  }

  const status = extractHttpStatus(error)
  if (status === 425) {
    return true
  }

  return isRetryableHttpError(error)
}

async function updatePetWeight(
  petId: number,
  weightId: number,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<WeightHistory> {
  return customInstance<WeightHistory>({
    url: `/pets/${petId}/weights/${weightId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayWeightUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingWeightUpdateOperation(operation)) {
    return
  }

  if (!isWeightUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid weight update payload',
    })
    return
  }

  const updateBody = updateBodyFromPayload(operation.payload)
  if (Object.keys(updateBody).length === 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Empty weight update payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePetWeight(
      operation.payload.petId,
      operation.payload.weightId,
      updateBody,
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetWeightsQueryKey(operation.payload.petId),
    })
  } catch (error) {
    const attempts = operation.attempts + 1
    const lastError = operationErrorMessage(error)

    if (isRetryableOperationError(error)) {
      await updateOperation(operation.id, {
        status: 'pending',
        attempts,
        lastError,
      })
      return
    }

    if (extractHttpStatus(error) === 409) {
      await updateOperation(operation.id, {
        status: 'conflicted',
        attempts,
        lastError,
      })
      return
    }

    await updateOperation(operation.id, {
      status: 'failed',
      attempts,
      lastError,
    })
  }
}

export async function replayPendingWeightUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter(isPendingWeightUpdateOperation)

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayWeightUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetWeightUpdateReplayForTests(): void {
  replaying = false
}
