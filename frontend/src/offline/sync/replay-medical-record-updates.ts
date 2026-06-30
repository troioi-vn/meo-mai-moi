import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { MedicalRecord } from '@/api/generated/model'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import {
  isMedicalRecordUpdatePayload,
  isPendingMedicalRecordUpdateOperation,
  listOperations,
  removeOperation,
  updateOperation,
  type MedicalRecordUpdatePayload,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

function updateBodyFromPayload(payload: MedicalRecordUpdatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (payload.record_type !== undefined) {
    body.record_type = payload.record_type
  }
  if (payload.description !== undefined) {
    body.description = payload.description
  }
  if (payload.record_date !== undefined) {
    body.record_date = payload.record_date
  }
  if (payload.vet_name !== undefined) {
    body.vet_name = payload.vet_name
  }

  return body
}

async function updatePetMedicalRecord(
  petId: number,
  recordId: number,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<MedicalRecord> {
  return customInstance<MedicalRecord>({
    url: `/pets/${petId}/medical-records/${recordId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayMedicalRecordUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingMedicalRecordUpdateOperation(operation)) {
    return
  }

  if (!isMedicalRecordUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid medical record update payload',
    })
    return
  }

  const updateBody = updateBodyFromPayload(operation.payload)
  if (Object.keys(updateBody).length === 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Empty medical record update payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePetMedicalRecord(
      operation.payload.petId,
      operation.payload.recordId,
      updateBody,
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(operation.payload.petId),
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

    if (extractHttpStatus(error) === 409) {
      await updateOperation(operation.id, {
        status: 'conflicted',
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

export async function replayPendingMedicalRecordUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingMedicalRecordUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayMedicalRecordUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetMedicalRecordUpdateReplayForTests(): void {
  replaying = false
}
