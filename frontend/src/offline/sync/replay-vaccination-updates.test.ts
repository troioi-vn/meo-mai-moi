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
  replayPendingVaccinationUpdates,
  replayVaccinationUpdateOperation,
  resetVaccinationUpdateReplayForTests,
} from './replay-vaccination-updates'

const petId = 123
const recordId = 1

async function enqueueVaccinationUpdate(idempotencyKey = 'vaccination-update-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'vaccination',
    entityId: recordId,
    operation: 'update',
    payload: {
      petId,
      recordId,
      vaccine_name: 'Updated Rabies',
      notes: 'Offline edit',
    },
  })
}

describe('replay-vaccination-updates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetVaccinationUpdateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates vaccinations after a successful replay', async () => {
    const operationId = await enqueueVaccinationUpdate()
    let receivedIdempotencyKey: string | null = null
    let receivedPayload: unknown = null

    server.use(
      http.put(
        `http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`,
        async ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          receivedPayload = await request.json()
          return HttpResponse.json({
            data: {
              id: recordId,
              vaccine_name: 'Updated Rabies',
              notes: 'Offline edit',
            },
          })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingVaccinationUpdates(queryClient)

    expect(receivedIdempotencyKey).toBe('vaccination-update-replay-1')
    expect(receivedPayload).toEqual({
      vaccine_name: 'Updated Rabies',
      notes: 'Offline edit',
    })
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetVaccinationsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueVaccinationUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationUpdates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueVaccinationUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The administered at has already been taken.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationUpdates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The administered at has already been taken.',
    })
  })

  it('marks update conflicts as conflicted', async () => {
    const operationId = await enqueueVaccinationUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
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
    await replayVaccinationUpdateOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'conflicted',
      attempts: 1,
    })
  })

  it('replays a manually retried failed vaccination update', async () => {
    const operationId = await enqueueVaccinationUpdate('vaccination-update-manual-retry')
    let callCount = 0

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'The administered at has already been taken.',
          },
          { status: 422 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationUpdates(queryClient)

    expect(callCount).toBe(1)

    server.use(
      http.put(
        `http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`,
        ({ request }) => {
          callCount += 1
          expect(request.headers.get('Idempotency-Key')).toBe('vaccination-update-manual-retry')
          return HttpResponse.json({
            data: {
              id: recordId,
              vaccine_name: 'Updated Rabies',
            },
          })
        }
      )
    )

    await retryFailedOperation(operationId)
    await replayPendingVaccinationUpdates(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
