import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayMedicalRecordDeleteOperation,
  replayPendingMedicalRecordDeletes,
  resetMedicalRecordDeleteReplayForTests,
} from './replay-medical-record-deletes'

const petId = 123
const recordId = 1

async function enqueueMedicalRecordDelete(idempotencyKey = 'medical-record-delete-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'medical_record',
    entityId: recordId,
    operation: 'delete',
    payload: {
      petId,
      recordId,
    },
  })
}

describe('replay-medical-record-deletes', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetMedicalRecordDeleteReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates medical records after a successful replay', async () => {
    const operationId = await enqueueMedicalRecordDelete()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.delete(
        `http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`,
        ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          return HttpResponse.json({ data: true })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingMedicalRecordDeletes(queryClient)

    expect(receivedIdempotencyKey).toBe('medical-record-delete-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
    })
  })

  it('treats 404 as success and removes the operation', async () => {
    const operationId = await enqueueMedicalRecordDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 })
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordDeletes(queryClient)

    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueMedicalRecordDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordDeletes(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks auth errors as failed', async () => {
    const operationId = await enqueueMedicalRecordDelete()

    server.use(
      http.delete(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
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
    await replayMedicalRecordDeleteOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Forbidden',
    })
  })
})
