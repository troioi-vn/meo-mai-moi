import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { invalidatePetMedicalRecords } from '@/lib/health-record-cache'
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
import { handleReplayOperationError } from './replay-operation-error'

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
    await invalidatePetMedicalRecords(queryClient, petId)
  } catch (error) {
    const status = extractHttpStatus(error)

    if (status === 404) {
      await removeOperation(operation.id)
      await invalidatePetMedicalRecords(queryClient, petId)
      return
    }

    await handleReplayOperationError(operation, error)
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
