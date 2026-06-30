import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import {
  getGetHabitsHabitHeatmapQueryKey,
  getGetHabitsQueryKey,
} from '@/api/generated/habits/habits'
import { server } from '@/testing/mocks/server'
import {
  replayHabitDayEntriesOperation,
  replayPendingHabitDayEntries,
  resetHabitDayEntriesReplayForTests,
} from './replay-habit-day-entries'

const habitId = 123
const date = '2026-04-10'

async function enqueueHabitDayEntries(idempotencyKey = 'habit-day-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'habit',
    entityId: habitId,
    operation: 'update',
    payload: {
      habitId,
      date,
      entries: [{ pet_id: 101, value_int: 1 }],
    },
  })
}

describe('replay-habit-day-entries', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetHabitDayEntriesReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates habit views after a successful replay', async () => {
    const operationId = await enqueueHabitDayEntries()
    let receivedIdempotencyKey: string | null = null
    let receivedPayload: unknown = null

    server.use(
      http.put(
        `http://localhost:3000/api/habits/${String(habitId)}/entries/${date}`,
        async ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          receivedPayload = await request.json()
          return HttpResponse.json({
            data: {
              habit: { id: habitId },
              date,
              entries: [{ pet_id: 101, value_int: 1 }],
            },
          })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingHabitDayEntries(queryClient)

    expect(receivedIdempotencyKey).toBe('habit-day-replay-1')
    expect(receivedPayload).toEqual({ entries: [{ pet_id: 101, value_int: 1 }] })
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetHabitsQueryKey() })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetHabitsHabitHeatmapQueryKey(habitId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueHabitDayEntries()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}/entries/${date}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingHabitDayEntries(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueHabitDayEntries()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}/entries/${date}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The entries field is required.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingHabitDayEntries(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The entries field is required.',
    })
  })

  it('marks 409 responses as conflicted', async () => {
    const operationId = await enqueueHabitDayEntries()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}/entries/${date}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This habit day changed on the server.',
          },
          { status: 409 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayHabitDayEntriesOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'conflicted',
      attempts: 1,
      lastError: 'This habit day changed on the server.',
    })
  })
})
