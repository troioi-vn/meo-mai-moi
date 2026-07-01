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
  updateOperation,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayPendingWeightUpdates,
  replayWeightUpdateOperation,
  resetWeightUpdateReplayForTests,
} from './replay-weight-updates'

const petId = 123
const weightId = 1

async function enqueueWeightUpdate(idempotencyKey = 'weight-update-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'weight',
    entityId: weightId,
    operation: 'update',
    payload: {
      petId,
      weightId,
      weight_kg: 5.5,
    },
  })
}

describe('replay-weight-updates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetWeightUpdateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates weights after a successful replay', async () => {
    const operationId = await enqueueWeightUpdate()
    let receivedIdempotencyKey: string | null = null
    let receivedPayload: unknown = null

    server.use(
      http.put(
        `http://localhost:3000/api/pets/${petId}/weights/${weightId}`,
        async ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          receivedPayload = await request.json()
          return HttpResponse.json({
            data: {
              id: weightId,
              weight_kg: 5.5,
              record_date: '2023-01-01',
            },
          })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingWeightUpdates(queryClient)

    expect(receivedIdempotencyKey).toBe('weight-update-replay-1')
    expect(receivedPayload).toEqual({ weight_kg: 5.5 })
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetWeightsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueWeightUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingWeightUpdates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueWeightUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
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
    await replayPendingWeightUpdates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The record date has already been taken for this pet.',
    })
  })

  it('marks idempotency conflicts as conflicted', async () => {
    const operationId = await enqueueWeightUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
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
    await replayWeightUpdateOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'conflicted',
      attempts: 1,
      lastError: 'This idempotency key was already used with a different request.',
      conflictMetadata: expect.objectContaining({
        idempotencyKey: 'weight-update-replay-1',
        operationId,
      }),
    })
  })

  it('stores structured version conflict metadata on replay', async () => {
    const operationId = await enqueueWeightUpdate('weight-update-version-conflict')
    await updateOperation(operationId, { baseVersion: '2024-01-01T00:00:00.000000Z' })

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This record changed on the server since your offline edit.',
            data: {
              server_value: {
                id: weightId,
                weight_kg: 4.2,
                updated_at: '2024-02-01T00:00:00.000000Z',
              },
              server_version: '2024-02-01T00:00:00.000000Z',
              client_base_version: '2024-01-01T00:00:00.000000Z',
            },
          },
          { status: 409 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayWeightUpdateOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'conflicted',
      conflictMetadata: {
        serverVersion: '2024-02-01T00:00:00.000000Z',
        clientBaseVersion: '2024-01-01T00:00:00.000000Z',
        idempotencyKey: 'weight-update-version-conflict',
      },
    })
  })

  it('is safe to replay with the same idempotency key after a retryable failure', async () => {
    const operationId = await enqueueWeightUpdate('weight-update-replay-safe')
    let callCount = 0

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, ({ request }) => {
        callCount += 1
        if (callCount === 1) {
          return HttpResponse.error()
        }

        expect(request.headers.get('Idempotency-Key')).toBe('weight-update-replay-safe')
        return HttpResponse.json({
          data: {
            id: weightId,
            weight_kg: 5.5,
            record_date: '2023-01-01',
          },
        })
      })
    )

    const queryClient = new QueryClient()

    await replayPendingWeightUpdates(queryClient)
    expect(await getOperation(operationId)).toMatchObject({ status: 'pending', attempts: 1 })

    await replayPendingWeightUpdates(queryClient)
    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })

  it('replays a manually retried failed weight update', async () => {
    const operationId = await enqueueWeightUpdate('weight-update-manual-retry')
    let callCount = 0

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, () => {
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
    await replayPendingWeightUpdates(queryClient)

    expect(callCount).toBe(1)
    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The record date has already been taken for this pet.',
    })

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/weights/${weightId}`, ({ request }) => {
        callCount += 1
        expect(request.headers.get('Idempotency-Key')).toBe('weight-update-manual-retry')
        return HttpResponse.json({
          data: {
            id: weightId,
            weight_kg: 5.5,
            record_date: '2023-01-01',
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

    await replayPendingWeightUpdates(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
