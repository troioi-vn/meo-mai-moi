import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { PostPetsPetWeightsBody } from '@/api/generated/model'
import { getGetPetsPetWeightsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import type { WeightHistory } from '@/api/generated/model'
import {
  isPendingWeightCreateOperation,
  isWeightCreatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

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
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingWeightCreateOperation(operation)
    )

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
