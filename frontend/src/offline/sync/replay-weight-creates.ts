import { onlineManager, type QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import type { PostPetsPetWeightsBody } from '@/api/generated/model'
import { getGetPetsPetWeightsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import type { WeightHistory } from '@/api/generated/model'
import {
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus, isRetryableHttpError } from '@/offline/queue-core'

let replaying = false

function isPendingWeightCreateOperation(operation: OfflineOperation): boolean {
  return (
    operation.entityType === 'weight' &&
    operation.operation === 'create' &&
    operation.status === 'pending'
  )
}

function isWeightCreatePayload(payload: unknown): payload is PostPetsPetWeightsBody {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as PostPetsPetWeightsBody
  return (
    typeof candidate.weight_kg === 'number' &&
    typeof candidate.record_date === 'string' &&
    candidate.record_date.length > 0
  )
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

async function createPetWeight(
  petId: number,
  payload: PostPetsPetWeightsBody,
  idempotencyKey: string
): Promise<WeightHistory> {
  return customInstance<WeightHistory>({
    url: `/pets/${petId}/weights`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayWeightCreateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingWeightCreateOperation(operation)) {
    return
  }

  if (!isWeightCreatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid weight create payload',
    })
    return
  }

  const petId = Number(operation.entityId)
  if (!Number.isFinite(petId) || petId <= 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet id for weight create replay',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await createPetWeight(petId, operation.payload, operation.idempotencyKey)
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetWeightsQueryKey(petId),
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

    await updateOperation(operation.id, {
      status: 'failed',
      attempts,
      lastError,
    })
  }
}

export async function replayPendingWeightCreates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter(isPendingWeightCreateOperation)

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayWeightCreateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetWeightCreateReplayForTests(): void {
  replaying = false
}
