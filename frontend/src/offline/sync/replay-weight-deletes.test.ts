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
  replayPendingWeightDeletes,
  replayWeightDeleteOperation,
  resetWeightDeleteReplayForTests,
} from './replay-weight-deletes'

const petId = 123
const weightId = 1

async function enqueueWeightDelete(idempotencyKey = 'weight-delete-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'weight',
    entityId: weightId,
    operation: 'delete',
    payload: {
      petId,
      weightId,
    },
  })
}

describe('replay-weight-deletes', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetWeightDeleteReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates weights after a successful replay', async () => {
    const operationId = await enqueueWeightDelete()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({ data: true })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingWeightDeletes(queryClient)

    expect(receivedIdempotencyKey).toBe('weight-delete-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetWeightsQueryKey(petId),
    })
  })

  it('treats 404 as success and removes the operation', async () => {
    const operationId = await enqueueWeightDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )

    const queryClient = new QueryClient()
    await replayPendingWeightDeletes(queryClient)

    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueWeightDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingWeightDeletes(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks auth errors as failed', async () => {
    const operationId = await enqueueWeightDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
          },
          { status: 403 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingWeightDeletes(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Forbidden',
    })
  })

  it('replays a manually retried failed weight delete', async () => {
    const operationId = await enqueueWeightDelete('weight-delete-manual-retry')
    let callCount = 0

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'Forbidden',
          },
          { status: 403 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingWeightDeletes(queryClient)

    expect(callCount).toBe(1)
    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Forbidden',
    })

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, ({ request }) => {
        callCount += 1
        expect(request.headers.get('Idempotency-Key')).toBe('weight-delete-manual-retry')
        return HttpResponse.json({ data: true })
      })
    )

    const retried = await retryFailedOperation(operationId)
    expect(retried).toMatchObject({
      status: 'pending',
      attempts: 1,
    })
    expect(retried?.lastError).toBeUndefined()

    await replayPendingWeightDeletes(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })

  it('replays through replayWeightDeleteOperation directly', async () => {
    const operationId = await enqueueWeightDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.json({ data: true })
      )
    )

    const queryClient = new QueryClient()
    await replayWeightDeleteOperation(queryClient, (await getOperation(operationId))!)

    expect(await listOperations()).toHaveLength(0)
  })
})
