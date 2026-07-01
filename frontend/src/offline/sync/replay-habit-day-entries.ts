import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { customInstance } from '@/api/orval-mutator'
import { invalidateHabitViews } from '@/lib/habit-cache'
import type { Habit } from '@/api/generated/model'
import {
  isHabitDayEntriesPayload,
  isPendingHabitDayEntriesOperation,
  listOperations,
  removeOperation,
  updateOperation,
  type HabitDayEntriesPayload,
  type OfflineOperation,
} from '@/offline/operations'
import { extractHttpStatus } from '@/offline/queue-core'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

let replaying = false

interface HabitDayEntriesReplayResponse {
  habit: Habit
  date: string
  entries: unknown[]
}

async function putHabitDayEntries(
  payload: HabitDayEntriesPayload,
  idempotencyKey: string
): Promise<HabitDayEntriesReplayResponse> {
  return customInstance<HabitDayEntriesReplayResponse>({
    url: `/habits/${String(payload.habitId)}/entries/${payload.date}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    data: {
      entries: payload.entries,
    },
  })
}

export async function replayHabitDayEntriesOperation(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  if (!isPendingHabitDayEntriesOperation(operation)) {
    return
  }

  if (!isHabitDayEntriesPayload(operation.payload)) {
    await updateOperation(operation.id, {
      status: 'failed',
      attempts: operation.attempts + 1,
      lastError: 'Invalid habit day entries payload',
    })
    return
  }

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await putHabitDayEntries(operation.payload, operation.idempotencyKey)
    await removeOperation(operation.id)
    await invalidateHabitViews(queryClient, operation.payload.habitId)
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

export async function replayPendingHabitDayEntries(queryClient: QueryClient): Promise<void> {
  if (replaying || !onlineManager.isOnline()) {
    return
  }

  replaying = true

  try {
    const pendingOperations = (await listOperations()).filter((operation) =>
      isPendingHabitDayEntriesOperation(operation)
    )

    for (const operation of pendingOperations) {
      if (!onlineManager.isOnline()) {
        break
      }

      await replayHabitDayEntriesOperation(queryClient, operation)
    }
  } finally {
    replaying = false
  }
}

export function resetHabitDayEntriesReplayForTests(): void {
  replaying = false
}
