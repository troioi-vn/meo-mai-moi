import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { PostPetsPetMedicalRecordsBody } from '@/api/generated/model'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import { customInstance } from '@/api/orval-mutator'
import type { MedicalRecord } from '@/api/generated/model'
import { promotePendingMedicalRecordPhotos } from '@/lib/media-upload-queue'
import {
  isMedicalRecordCreatePayload,
  isPendingMedicalRecordCreateOperation,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
  type MedicalRecordCreatePayload,
} from '@/offline/operations'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

function createBodyFromPayload(payload: MedicalRecordCreatePayload): PostPetsPetMedicalRecordsBody {
  return {
    record_type: payload.record_type,
    description: payload.description,
    record_date: payload.record_date,
    vet_name: payload.vet_name ?? undefined,
  }
}

async function createPetMedicalRecord(
  petId: number,
  payload: PostPetsPetMedicalRecordsBody,
  idempotencyKey: string
): Promise<MedicalRecord> {
  return customInstance<MedicalRecord>({
    url: `/pets/${petId}/medical-records`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayMedicalRecordCreateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingMedicalRecordCreateOperation(operation)) {
    return
  }

  if (!isMedicalRecordCreatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid medical record create payload',
    })
    return
  }

  const petId = operation.payload.petId
  if (!Number.isFinite(petId) || petId <= 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet id for medical record create replay',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    const record = await createPetMedicalRecord(
      petId,
      createBodyFromPayload(operation.payload),
      operation.idempotencyKey
    )
    if (record.id != null) {
      await promotePendingMedicalRecordPhotos({
        petId,
        localRecordId: operation.localEntityId ?? operation.id,
        recordId: record.id,
      })
    }
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
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

export async function replayPendingMedicalRecordCreates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingMedicalRecordCreateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayMedicalRecordCreateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetMedicalRecordCreateReplayForTests(): void {
  replaying = false
}
