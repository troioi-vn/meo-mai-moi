import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { WeightHistory } from '@/api/generated/model'
import { invalidatePetWeights } from '@/lib/health-record-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isPendingWeightUpdateOperation,
  isWeightUpdatePayload,
  listOperations,
  removeOperation,
  updateOperation,
  type OfflineOperation,
  type WeightUpdatePayload,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { withBaseVersion } from './replay-request'

let replaying = false

function updateBodyFromPayload(payload: WeightUpdatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if (payload.weight_kg !== undefined) {
    body.weight_kg = payload.weight_kg
  }
  if (payload.record_date !== undefined) {
    body.record_date = payload.record_date
  }
  if (payload.tare_weight_kg !== undefined) {
    body.tare_weight_kg = payload.tare_weight_kg
  }

  return body
}

async function updatePetWeight(
  petId: number,
  weightId: number,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<WeightHistory> {
  return customInstance<WeightHistory>({
    url: `/pets/${petId}/weights/${weightId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload,
  })
}

export async function replayWeightUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingWeightUpdateOperation(operation)) {
    return
  }

  if (!isWeightUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid weight update payload',
    })
    return
  }

  const updateBody = updateBodyFromPayload(operation.payload)
  if (Object.keys(updateBody).length === 0) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Empty weight update payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updatePetWeight(
      operation.payload.petId,
      operation.payload.weightId,
      withBaseVersion(updateBody, operation.baseVersion),
      operation.idempotencyKey
    )
    await removeOperation(operation.id)
    await invalidatePetWeights(queryClient, operation.payload.petId)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingWeightUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingWeightUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayWeightUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetWeightUpdateReplayForTests(): void {
  replaying = false
}
