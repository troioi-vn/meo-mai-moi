import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetMyPetsSectionsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayPendingPetCreates,
  replayPetCreateOperation,
  resetPetCreateReplayForTests,
} from './replay-pet-creates'

async function enqueuePetCreate(idempotencyKey = 'pet-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'pet',
    entityId: idempotencyKey,
    operation: 'create',
    localEntityId: idempotencyKey,
    payload: {
      name: 'Offline Cat',
      description: 'Queued offline',
      country: 'VN',
      pet_type_id: 1,
      birthday_precision: 'unknown',
    },
  })
}

describe('replay-pet-creates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetPetCreateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates pet collections after a successful replay', async () => {
    const operationId = await enqueuePetCreate()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.post('http://localhost:3000/api/pets', ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          data: {
            id: 42,
            name: 'Offline Cat',
            description: 'Queued offline',
            country: 'VN',
            pet_type_id: 1,
            birthday_precision: 'unknown',
            status: 'active',
          },
        })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingPetCreates(queryClient)

    expect(receivedIdempotencyKey).toBe('pet-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetMyPetsSectionsQueryKey(),
    })
  })

  it('is safe to replay with the same idempotency key after a retryable failure', async () => {
    const operationId = await enqueuePetCreate('pet-replay-safe')
    let callCount = 0

    server.use(
      http.post('http://localhost:3000/api/pets', ({ request }) => {
        callCount += 1
        if (callCount === 1) {
          return HttpResponse.error()
        }

        expect(request.headers.get('Idempotency-Key')).toBe('pet-replay-safe')
        return HttpResponse.json({
          data: {
            id: 43,
            name: 'Offline Cat',
            description: 'Queued offline',
            country: 'VN',
            pet_type_id: 1,
            birthday_precision: 'unknown',
            status: 'active',
          },
        })
      })
    )

    const queryClient = new QueryClient()

    await replayPendingPetCreates(queryClient)
    expect(await getOperation(operationId)).toMatchObject({ status: 'pending', attempts: 1 })

    await replayPendingPetCreates(queryClient)
    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueuePetCreate()

    server.use(
      http.post('http://localhost:3000/api/pets', () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The name has already been taken.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPetCreateOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The name has already been taken.',
    })
  })
})
