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
  replayMedicalRecordUpdateOperation,
  replayPendingMedicalRecordUpdates,
  resetMedicalRecordUpdateReplayForTests,
} from './replay-medical-record-updates'

const petId = 123
const recordId = 1

async function enqueueMedicalRecordUpdate(idempotencyKey = 'medical-record-update-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'medical_record',
    entityId: recordId,
    operation: 'update',
    payload: {
      petId,
      recordId,
      description: 'Updated checkup',
      vet_name: null,
    },
  })
}

describe('replay-medical-record-updates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetMedicalRecordUpdateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates medical records after a successful replay', async () => {
    const operationId = await enqueueMedicalRecordUpdate()
    let receivedIdempotencyKey: string | null = null
    let receivedPayload: unknown = null

    server.use(
      http.put(
        `http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`,
        async ({ request }) => {
          receivedIdempotencyKey = request.headers.get('Idempotency-Key')
          receivedPayload = await request.json()
          return HttpResponse.json({
            data: {
              id: recordId,
              description: 'Updated checkup',
              vet_name: null,
            },
          })
        }
      )
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingMedicalRecordUpdates(queryClient)

    expect(receivedIdempotencyKey).toBe('medical-record-update-replay-1')
    expect(receivedPayload).toEqual({ description: 'Updated checkup', vet_name: null })
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueMedicalRecordUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordUpdates(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueMedicalRecordUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The description field is required.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordUpdates(queryClient)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The description field is required.',
    })
  })

  it('marks idempotency conflicts as conflicted', async () => {
    const operationId = await enqueueMedicalRecordUpdate()

    server.use(
      http.put(`http://localhost:3000/api/pets/${petId}/medical-records/${recordId}`, () =>
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
    await replayMedicalRecordUpdateOperation(queryClient, (await getOperation(operationId))!)

    expect(await getOperation(operationId)).toMatchObject({
      status: 'conflicted',
      attempts: 1,
      lastError: 'This idempotency key was already used with a different request.',
    })
  })
})
