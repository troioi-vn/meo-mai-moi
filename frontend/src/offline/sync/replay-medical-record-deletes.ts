import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import {
  isMedicalRecordDeletePayload,
  isPendingMedicalRecordDeleteOperation,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

async function deletePetMedicalRecord(
  petId: number,
  recordId: number,
  idempotencyKey: string
): Promise<void> {
  await customInstance({
    url: `/pets/${petId}/medical-records/${recordId}`,
    method: 'DELETE',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  })
}

export async function replayMedicalRecordDeleteOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingMedicalRecordDeleteOperation(operation)) {
    return
  }

  if (!isMedicalRecordDeletePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid medical record delete payload',
    })
    return
  }

  const { petId, recordId } = operation.payload

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await deletePetMedicalRecord(petId, recordId, operation.idempotencyKey)
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
    })
  } catch (error) {
    const status = extractHttpStatus(error)

    if (status === 404) {
      await removeOperation(operation.id)
      await queryClient.invalidateQueries({
        queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
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

export async function replayPendingMedicalRecordDeletes(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingMedicalRecordDeleteOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayMedicalRecordDeleteOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetMedicalRecordDeleteReplayForTests(): void {
  replaying = false
}
