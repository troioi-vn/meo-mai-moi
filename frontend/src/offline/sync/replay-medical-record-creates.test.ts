import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { getGetPetsPetMedicalRecordsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  getOperation,
  listOperations,
  resetOperationsStoreForTests,
  retryFailedOperation,
} from '@/offline/operations'
import { server } from '@/testing/mocks/server'
import {
  replayMedicalRecordCreateOperation,
  replayPendingMedicalRecordCreates,
  resetMedicalRecordCreateReplayForTests,
} from './replay-medical-record-creates'

const petId = 123

async function enqueueMedicalRecordCreate(idempotencyKey = 'medical-record-replay-1') {
  return enqueueOperation({
    idempotencyKey,
    entityType: 'medical_record',
    entityId: petId,
    operation: 'create',
    localEntityId: idempotencyKey,
    payload: {
      petId,
      record_type: 'vet_visit',
      description: 'Annual checkup',
      record_date: '2024-01-01',
      vet_name: 'Dr. Smith',
    },
  })
}

describe('replay-medical-record-creates', () => {
  beforeEach(async () => {
    onlineManager.setOnline(true)
    await resetOperationsStoreForTests()
    resetMedicalRecordCreateReplayForTests()
    server.resetHandlers()
  })

  it('removes the operation and invalidates medical records after a successful replay', async () => {
    const operationId = await enqueueMedicalRecordCreate()
    let receivedIdempotencyKey: string | null = null

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, ({ request }) => {
        receivedIdempotencyKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json({
          data: {
            id: 99,
            record_type: 'vet_visit',
            description: 'Annual checkup',
            record_date: '2024-01-01',
            vet_name: 'Dr. Smith',
            photos: [],
          },
        })
      })
    )

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await replayPendingMedicalRecordCreates(queryClient)

    expect(receivedIdempotencyKey).toBe('medical-record-replay-1')
    expect(await listOperations()).toHaveLength(0)
    expect(await getOperation(operationId)).toBeUndefined()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getGetPetsPetMedicalRecordsQueryKey(petId),
    })
  })

  it('returns retryable network errors to pending with attempts and lastError', async () => {
    const operationId = await enqueueMedicalRecordCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () =>
        HttpResponse.error()
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: expect.any(String),
    })
  })

  it('marks validation errors as failed', async () => {
    const operationId = await enqueueMedicalRecordCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'The record date field is required.',
          },
          { status: 422 }
        )
      )
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordCreates(queryClient)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'The record date field is required.',
    })
  })

  it('marks auth errors as failed', async () => {
    const operationId = await enqueueMedicalRecordCreate()

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () =>
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
    await replayMedicalRecordCreateOperation(queryClient, (await getOperation(operationId))!)

    const operation = await getOperation(operationId)
    expect(operation).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'This action is unauthorized.',
    })
  })

  it('replays a manually retried failed medical record create', async () => {
    const operationId = await enqueueMedicalRecordCreate('medical-record-manual-retry')
    let callCount = 0

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, () => {
        callCount += 1
        return HttpResponse.json(
          {
            success: false,
            message: 'The record date field is required.',
          },
          { status: 422 }
        )
      })
    )

    const queryClient = new QueryClient()
    await replayPendingMedicalRecordCreates(queryClient)

    expect(callCount).toBe(1)
    expect(await getOperation(operationId)).toMatchObject({
      status: 'failed',
      attempts: 1,
    })

    server.use(
      http.post(`http://localhost:3000/api/pets/${petId}/medical-records`, ({ request }) => {
        callCount += 1
        expect(request.headers.get('Idempotency-Key')).toBe('medical-record-manual-retry')
        return HttpResponse.json({
          data: {
            id: 101,
            record_type: 'vet_visit',
            description: 'Annual checkup',
            record_date: '2024-01-01',
            vet_name: 'Dr. Smith',
            photos: [],
          },
        })
      })
    )

    const retried = await retryFailedOperation(operationId)
    expect(retried).toMatchObject({
      status: 'pending',
      attempts: 1,
    })

    await replayPendingMedicalRecordCreates(queryClient)

    expect(callCount).toBe(2)
    expect(await listOperations()).toHaveLength(0)
  })
})
