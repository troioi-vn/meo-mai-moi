import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import { invalidatePetCollectionQueries } from '@/lib/pet-cache'
import { customInstance } from '@/api/orval-mutator'
import { promotePendingPetPhoto } from '@/lib/media-upload-queue'
import {
  isPendingPetCreateOperation,
  isPetCreatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { remapPetLocalId } from './remap-pet-local-id'

let replaying = false

async function createPet(payload: Pet, idempotencyKey: string): Promise<Pet> {
  return customInstance<Pet>({
    url: '/pets',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayPetCreateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingPetCreateOperation(operation)) {
    return
  }

  if (!isPetCreatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet create payload',
    })
    return
  }

  const localEntityId = operation.localEntityId ?? operation.id

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    const createdPet = await createPet(operation.payload as Pet, operation.idempotencyKey)

    await remapPetLocalId(localEntityId, createdPet.id)
    await promotePendingPetPhoto({
      petId: createdPet.id,
      localEntityId,
    })

    await removeOperation(operation.id)
    await invalidatePetCollectionQueries(queryClient)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingPetCreates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingPetCreateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayPetCreateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetPetCreateReplayForTests(): void {
  replaying = false
}
