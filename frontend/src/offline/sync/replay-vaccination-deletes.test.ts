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
  replayPendingVaccinationDeletes,
  replayVaccinationDeleteOperation,
  resetVaccinationDeleteReplayForTests,
} from './replay-vaccination-deletes'

const petId = 123
const recordId = 1

async function enqueueVaccinationDelete(idempotencyKey = 'vaccination-delete-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'vaccination',
    entityId: recordId,
    operation: 'delete',
    payload: {
      petId,
      recordId,
    },
  })
}

describe('replay-vaccination-deletes', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetVaccinationDeleteReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates vaccinations after a successful replay', async () => {
    const operationId = await enqueueVaccinationDelete()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.delete(
        `http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`,
        ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          return HttpResponse.json({ data: true })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingVaccinationDeletes(queryClient)

    expect(receivedIdempotencyKey).toBe('vaccination-delete-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetVaccinationsQueryKey(petId),
    })
  })

  it('treats 404 as success and clears the operation', async () => {
    const operationId = await enqueueVaccinationDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
        HttpResponse.json({ success: false, message: 'Not found' }, { status: 404 })
      )
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationDeletes(queryClient)

    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueVaccinationDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationDeletes(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks auth errors as failed', async () => {
    const operationId = await enqueueVaccinationDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () =>
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
    await replayVaccinationDeleteOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'This action is unauthorized.',
    })
  })

  it('replays a manually retried failed vaccination delete', async () => {
    const operationId = await enqueueVaccinationDelete('vaccination-delete-manual-retry')
    let callCount = 0

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'This action is unauthorized.',
          },
          { status: 403 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingVaccinationDeletes(queryClient)

    expect(callCount).toBe(1)

    server.use(
      http.delete(
        `http://localhost:3000/api/pets/${petId}/vaccinations/${recordId}`,
        ({ request }) => {
          callCount += 1
          expect(request.headers.get('Idempotency-Key')).toBe('vaccination-delete-manual-retry')
          return HttpResponse.json({ data: true })
        }
      )
    )

    await retryFailedOperation(operationId)
    await replayPendingVaccinationDeletes(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
