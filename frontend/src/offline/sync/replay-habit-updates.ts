import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { Habit } from '@/api/generated/model'
import { invalidateHabitViews } from '@/lib/habit-cache'
import { customInstance } from '@/api/orval-mutator'
import {
  isHabitUpdatePayload,
  isPendingHabitUpdateOperation,
  listOperations,
  removeOperation,
  updateOperation,
  type HabitUpdatePayload,
  type OfflineOperation,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { withBaseVersion } from './replay-request'

let replaying = false

async function updateHabit(
  payload: HabitUpdatePayload,
  idempotencyKey: string,
  baseVersion?: string
): Promise<Habit> {
  return customInstance<Habit>({
    url: `/habits/${String(payload.habitId)}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: withBaseVersion(payload.data, baseVersion),
  })
}

export async function replayHabitUpdateOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingHabitUpdateOperation(operation)) {
    return
  }

  if (!isHabitUpdatePayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid habit update payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await updateHabit(operation.payload, operation.idempotencyKey, operation.baseVersion)
    await removeOperation(operation.id)
    await invalidateHabitViews(queryClient, operation.payload.habitId)
  } catch (error) {
    await handleReplayOperationError(operation, error)
  }
}

export async function replayPendingHabitUpdates(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingHabitUpdateOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayHabitUpdateOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetHabitUpdateReplayForTests(): void {
  replaying = false
}
