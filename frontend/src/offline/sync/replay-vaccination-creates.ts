import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { PostPetsPetVaccinationsBody } from '@/api/generated/model'
import { invalidatePetVaccinations } from '@/lib/health-record-cache'
import { customInstance } from '@/api/orval-mutator'
import type { VaccinationRecord } from '@/api/generated/model'
import {
  isPendingVaccinationCreateOperation,
  isVaccinationCreatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
  type VaccinationCreatePayload,
} from '@/offline/operations'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

function createBodyFromPayload(payload: VaccinationCreatePayload): PostPetsPetVaccinationsBody {
  return {
    vaccine_name: payload.vaccine_name,
    administered_at: payload.administered_at,
    due_at: payload.due_at ?? undefined,
    notes: payload.notes ?? undefined,
  }
}

async function createPetVaccination(
  petId: number,
  payload: PostPetsPetVaccinationsBody,
  idempotencyKey: string
): Promise<VaccinationRecord> {
  return customInstance<VaccinationRecord>({
    url: `/pets/${petId}/vaccinations`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayVaccinationCreateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingVaccinationCreateOperation(operation)) {
    return
  }

  if (!isVaccinationCreatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid vaccination create payload',
    })
    return
  }

  const petId = operation.payload.petId
  if (!Number.isFinite(petId) || petId <= 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid pet id for vaccination create replay',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await createPetVaccination(
      petId,
      createBodyFromPayload(operation.payload),
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await invalidatePetVaccinations(queryClient, petId)
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

export async function replayPendingVaccinationCreates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingVaccinationCreateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayVaccinationCreateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetVaccinationCreateReplayForTests(): void {
  replaying = false
}
