import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingPetDeleteOperation,
  isPetDeletePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { handleReplayOperationError } from './replay-operation-error'

let replaying = false

async function deletePet(petId: number, idempotencyKey: string): Promise<void> {
  await customInstance({
    url: `/pets/${petId}`,
    method: 'DELETE',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  })
}

export async function replayPetDeleteOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingPetDeleteOperation(operation)) {
    return
  }

  if (!isPetDeletePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet delete payload',
    })
    return
  }

  const { petId } = operation.payload
  if (!Number.isFinite(petId) || petId <= 0) {
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await deletePet(petId, operation.idempotencyKey)
    await removeOperation(operation.id)
    await invalidatePetProfileQueries(queryClient, petId)
    await invalidatePetCollectionQueries(queryClient)
  } catch (error) {
    const status = extractHttpStatus(error)

    if (status === 404) {
      await removeOperation(operation.id)
      await invalidatePetProfileQueries(queryClient, petId)
      await invalidatePetCollectionQueries(queryClient)
      return
    }

    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingPetDeletes(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingPetDeleteOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayPetDeleteOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetPetDeleteReplayForTests(): void {
  replaying = false
}
