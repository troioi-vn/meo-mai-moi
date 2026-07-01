import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingPetStatusUpdateOperation,
  isPetStatusUpdatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'

let replaying = false

async function updatePetStatus(
  petId: number,
  payload: PutPetsIdStatusBody,
  idempotencyKey: string
): Promise<void> {
  await customInstance({
    url: `/pets/${petId}/status`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayPetStatusUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingPetStatusUpdateOperation(operation)) {
    return
  }

  if (!isPetStatusUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet status update payload',
    })
    return
  }

  const { petId, status } = operation.payload
  if (!Number.isFinite(petId) || petId <= 0) {
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePetStatus(petId, { status }, operation.idempotencyKey)
    await removeOperation(operation.id)
    await invalidatePetProfileQueries(queryClient, petId)
    await invalidatePetCollectionQueries(queryClient)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingPetStatusUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingPetStatusUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayPetStatusUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetPetStatusUpdateReplayForTests(): void {
  replaying = false
}
