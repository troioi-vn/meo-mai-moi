import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { customInstance } from '@/api/orval-mutator'
import { invalidateHabitViews } from '@/lib/habit-cache'
import type { Habit } from '@/api/generated/model'
import {
  isHabitDayEntriesPayload,
  isPendingHabitDayEntriesOperation,
  listOperations,
  updateOperation,
  type HabitDayEntriesPayload,
  type OfflineOperation,
} from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'
import { finalizeReplayedOperation } from './finalize-replayed-operation'

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

  const habitId = operation.payload.habitId

  await updateOperation(operation.id, { status: 'syncing' })

  try {
    await putHabitDayEntries(operation.payload, operation.idempotencyKey)
    await finalizeReplayedOperation(queryClient, operation, () =>
      invalidateHabitViews(queryClient, habitId)
    )
  } catch (error) {
    await handleReplayOperationError(operation, error)
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
