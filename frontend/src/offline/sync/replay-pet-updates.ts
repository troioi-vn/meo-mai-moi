import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingPetUpdateOperation,
  isPetUpdatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { withBaseVersion } from './replay-request'

let replaying = false

async function updatePet(
  petId: number,
  payload: Partial<Pet>,
  idempotencyKey: string
): Promise<Pet> {
  return customInstance<Pet>({
    url: `/pets/${petId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayPetUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingPetUpdateOperation(operation)) {
    return
  }

  if (!isPetUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet update payload',
    })
    return
  }

  const { petId, data } = operation.payload
  if (!Number.isFinite(petId) || petId === 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet id for update replay',
    })
    return
  }

  if (petId < 0) {
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePet(
      petId,
      withBaseVersion(data, operation.baseVersion) as Partial<Pet>,
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await invalidatePetProfileQueries(queryClient, petId)
    await invalidatePetCollectionQueries(queryClient)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingPetUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingPetUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayPetUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetPetUpdateReplayForTests(): void {
  replaying = false
}
