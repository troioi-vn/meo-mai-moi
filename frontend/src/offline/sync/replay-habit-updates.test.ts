import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetHabitsHabitQueryKey, getGetHabitsQueryKey } from '@/api/generated/habits/habits'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayHabitUpdateOperation,
  replayPendingHabitUpdates,
  resetHabitUpdateReplayForTests,
} from './replay-habit-updates'

const habitId = 123

async function enqueueHabitUpdate(idempotencyKey = 'habit-update-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'habit',
    entityId: habitId,
    operation: 'update',
    payload: {
      kind: 'habit-update',
      habitId,
      data: {
        name: 'Dinner meds',
        reminder_enabled: true,
      },
    },
  })
}

describe('replay-habit-updates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetHabitUpdateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates habit views after a successful replay', async () => {
    const operationId = await enqueueHabitUpdate()
    let receivedIdempotencyKey: string | null = null
    let receivedPayload: unknown = null

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}`, async ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        receivedPayload = await request.json()
        return HttpResponse.json({
          data: {
            id: habitId,
            name: 'Dinner meds',
          },
        })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingHabitUpdates(queryClient)

    expect(receivedIdempotencyKey).toBe('habit-update-replay-1')
    expect(receivedPayload).toEqual({ name: 'Dinner meds', reminder_enabled: true })
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetHabitsHabitQueryKey(habitId),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetHabitsQueryKey() })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueHabitUpdate()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}`, () => HttpResponse.error())
    )

    const queryClient = new QueryClient()
    await replayPendingHabitUpdates(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueHabitUpdate()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The name field is required.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingHabitUpdates(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The name field is required.',
    })
  })

  it('marks 409 responses as conflicted', async () => {
    const operationId = await enqueueHabitUpdate()

    server.use(
      http.put(`http://localhost:3000/api/habits/${String(habitId)}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This habit changed on the server.',
          },
          { status: 409 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayHabitUpdateOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'conflicted',
      attempts: 1,
      lastError: 'This habit changed on the server.',
    })
  })
})
