import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetPetsPetVaccinationsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
  retryFailedOperation,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayPendingVaccinationCreates,
  replayVaccinationCreateOperation,
  resetVaccinationCreateReplayForTests,
} from './replay-vaccination-creates'

const petId = 123

async function enqueueVaccinationCreate(idempotencyKey = 'vaccination-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'vaccination',
    entityId: petId,
    operation: 'create',
    localEntityId: idempotencyKey,
    payload: {
      petId,
      vaccine_name: 'Rabies',
      administered_at: '2024-01-01',
      due_at: '2025-01-01',
      notes: 'Offline dose',
    },
  })
}

describe('replay-vaccination-creates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetVaccinationCreateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates vaccinations after a successful replay', async () => {
    const operationId = await enqueueVaccinationCreate()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          data: {
            id: 99,
            pet_id: petId,
            vaccine_name: 'Rabies',
            administered_at: '2024-01-01',
          },
        })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingVaccinationCreates(queryClient)

    expect(receivedIdempotencyKey).toBe('vaccination-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetVaccinationsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueVaccinationCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => HttpResponse.error())
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueVaccinationCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The vaccine name has already been taken for this date.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The vaccine name has already been taken for this date.',
    })
  })

  it('marks auth errors as failed', async () => {
    const operationId = await enqueueVaccinationCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'This action is unauthorized.',
          },
          { status: 403 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayVaccinationCreateOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'This action is unauthorized.',
    })
  })

  it('replays a manually retried failed vaccination create', async () => {
    const operationId = await enqueueVaccinationCreate('vaccination-manual-retry')
    let callCount = 0

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'The vaccine name has already been taken for this date.',
          },
          { status: 422 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationCreates(queryClient)

    expect(callCount).toBe(1)
    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
    })

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/vaccinations`, ({ request }) => {
        callCount += 1
        expect(request.headers.get('Idempotency-Key')).toBe('vaccination-manual-retry')
        return HttpResponse.json({
          data: {
            id: 101,
            pet_id: petId,
            vaccine_name: 'Rabies',
            administered_at: '2024-01-01',
          },
        })
      })
    )

    const retried = await retryFailedOperation(operationId)
    expect(retried).toMatchObject({
      status: 'pending',
      attempts: 1,
    })

    await replayPendingVaccinationCreates(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
