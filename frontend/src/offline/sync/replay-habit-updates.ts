import { onlineManager, type QueryClient } from '@tanstack/react-query'
import type { Habit } from '@/api/generated/model'
import { getGetHabitsHabitQueryKey, getGetHabitsQueryKey } from '@/api/generated/habits/habits'
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
import { extractHttpStatus } from '@/offline/queue-core'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

async function updateHabit(payload: HabitUpdatePayload, idempotencyKey: string): Promise<Habit> {
  return customInstance<Habit>({
    url: `/habits/${String(payload.habitId)}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: payload.data,
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
    await updateHabit(operation.payload, operation.idempotencyKey)
    await removeOperation(operation.id)
    await queryClient.invalidateQueries({
      queryKey: getGetHabitsHabitQueryKey(operation.payload.habitId),
    })
    await queryClient.invalidateQueries({
      queryKey: getGetHabitsQueryKey(),
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
