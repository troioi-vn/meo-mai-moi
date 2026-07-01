import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetPetsPetWeightsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
  retryFailedOperation,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayPendingWeightCreates,
  replayWeightCreateOperation,
  resetWeightCreateReplayForTests,
} from './replay-weight-creates'

const petId = 123

async function enqueueWeightCreate(idempotencyKey = 'weight-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'weight',
    entityId: petId,
    operation: 'create',
    localEntityId: idempotencyKey,
    payload: {
      weight_kg: 5.5,
      record_date: '2024-01-01',
    },
  })
}

describe('replay-weight-creates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetWeightCreateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates weights after a successful replay', async () => {
    const operationId = await enqueueWeightCreate()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          data: {
            id: 99,
            weight_kg: 5.5,
            record_date: '2024-01-01',
          },
        })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingWeightCreates(queryClient)

    expect(receivedIdempotencyKey).toBe('weight-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetWeightsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueWeightCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, () => HttpResponse.error())
    )

    const queryClient = new QueryClient()
    await replayPendingWeightCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueWeightCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The record date has already been taken for this pet.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingWeightCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The record date has already been taken for this pet.',
    })
  })

  it('marks idempotency conflicts as conflicted', async () => {
    const operationId = await enqueueWeightCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This idempotency key was already used with a different request.',
          },
          { status: 409 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayWeightCreateOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'conflicted',
      attempts: 1,
      lastError: 'This idempotency key was already used with a different request.',
      conflictMetadata: {
        idempotencyKey: 'weight-replay-1',
        operationId,
      },
    })
  })

  it('is safe to replay with the same idempotency key after a retryable failure', async () => {
    const operationId = await enqueueWeightCreate('weight-replay-safe')
    let callCount = 0

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, ({ request }) => {
        callCount += 1
        if (callCount === 1) {
          return HttpResponse.error()
        }

        expect(request.headers.get('Idempotency-Key')).toBe('weight-replay-safe')
        return HttpResponse.json({
          data: {
            id: 100,
            weight_kg: 5.5,
            record_date: '2024-01-01',
          },
        })
      })
    )

    const queryClient = new QueryClient()

    await replayPendingWeightCreates(queryClient)
    expect(await getOperation(operationId)).toMatchObject({ status: 'pending', attempts: 1 })

    await replayPendingWeightCreates(queryClient)
    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })

  it('replays a manually retried failed weight create', async () => {
    const operationId = await enqueueWeightCreate('weight-manual-retry')
    let callCount = 0

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'The record date has already been taken for this pet.',
          },
          { status: 422 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingWeightCreates(queryClient)

    expect(callCount).toBe(1)
    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The record date has already been taken for this pet.',
    })

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/weights`, ({ request }) => {
        callCount += 1
        expect(request.headers.get('Idempotency-Key')).toBe('weight-manual-retry')
        return HttpResponse.json({
          data: {
            id: 101,
            weight_kg: 5.5,
            record_date: '2024-01-01',
          },
        })
      })
    )

    const retried = await retryFailedOperation(operationId)
    expect(retried).toMatchObject({
      status: 'pending',
      attempts: 1,
    })
    expect(retried?.lastError).toBeUndefined()

    await replayPendingWeightCreates(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
