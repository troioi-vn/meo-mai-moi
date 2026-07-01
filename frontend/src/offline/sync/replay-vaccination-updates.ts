import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { VaccinationRecord } from '@/api/generated/model'
import { invalidatePetVaccinations } from '@/lib/health-record-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingVaccinationUpdateOperation,
  isVaccinationUpdatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
  type VaccinationUpdatePayload,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { withBaseVersion } from './replay-request'

let replaying = false

function updateBodyFromPayload(payload: VaccinationUpdatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (payload.vaccine_name !== undefined) {
    body.vaccine_name = payload.vaccine_name
  }
  if (payload.administered_at !== undefined) {
    body.administered_at = payload.administered_at
  }
  if (payload.due_at !== undefined) {
    body.due_at = payload.due_at
  }
  if (payload.notes !== undefined) {
    body.notes = payload.notes
  }

  return body
}

async function updatePetVaccination(
  petId: number,
  recordId: number,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<VaccinationRecord> {
  return customInstance<VaccinationRecord>({
    url: `/pets/${petId}/vaccinations/${recordId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayVaccinationUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingVaccinationUpdateOperation(operation)) {
    return
  }

  if (!isVaccinationUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid vaccination update payload',
    })
    return
  }

  const updateBody = updateBodyFromPayload(operation.payload)
  if (Object.keys(updateBody).length === 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Empty vaccination update payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePetVaccination(
      operation.payload.petId,
      operation.payload.recordId,
      withBaseVersion(updateBody, operation.baseVersion),
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await invalidatePetVaccinations(queryClient, operation.payload.petId)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingVaccinationUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingVaccinationUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayVaccinationUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetVaccinationUpdateReplayForTests(): void {
  replaying = false
}
