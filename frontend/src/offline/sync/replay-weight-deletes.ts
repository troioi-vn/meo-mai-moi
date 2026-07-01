import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { invalidatePetWeights } from '@/lib/health-record-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingWeightDeleteOperation,
  isWeightDeletePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { handleReplayOperationError } from './replay-operation-error'

let replaying = false

async function deletePetWeight(
  petId: number,
  weightId: number,
  idempotencyKey: string
): Promise<void> {
  await customInstance({
    url: `/pets/${petId}/weights/${weightId}`,
    method: 'DELETE',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  })
}

export async function replayWeightDeleteOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingWeightDeleteOperation(operation)) {
    return
  }

  if (!isWeightDeletePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid weight delete payload',
    })
    return
  }

  const { petId, weightId } = operation.payload

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await deletePetWeight(petId, weightId, operation.idempotencyKey)
    await removeOperation(operation.id)
    await invalidatePetWeights(queryClient, petId)
  } catch (error) {
    const status = extractHttpStatus(error)

    if (status === 404) {
      await removeOperation(operation.id)
      await invalidatePetWeights(queryClient, petId)
      return
    }

    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingWeightDeletes(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingWeightDeleteOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayWeightDeleteOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetWeightDeleteReplayForTests(): void {
  replaying = false
}
