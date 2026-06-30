import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { getGetPetsPetVaccinationsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingVaccinationDeleteOperation,
  isVaccinationDeletePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

async function deletePetVaccination(
  petId: number,
  recordId: number,
  idempotencyKey: string
): Promise<void> {
  await customInstance({
    url: `/pets/${petId}/vaccinations/${recordId}`,
    method: 'DELETE',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  })
}

export async function replayVaccinationDeleteOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingVaccinationDeleteOperation(operation)) {
    return
  }

  if (!isVaccinationDeletePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid vaccination delete payload',
    })
    return
  }

  const { petId, recordId } = operation.payload

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await deletePetVaccination(petId, recordId, operation.idempotencyKey)
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetVaccinationsQueryKey(petId),
    })
  } catch (error) {
    const status = extractHttpStatus(error)

    if (status === 404) {
      await removeOperation(operation.id)
      await queryClient.invalidateQueries({
        queryKey: getGetPetsPetVaccinationsQueryKey(petId),
      })
      return
    }

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

export async function replayPendingVaccinationDeletes(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingVaccinationDeleteOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayVaccinationDeleteOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetVaccinationDeleteReplayForTests(): void {
  replaying = false
}
