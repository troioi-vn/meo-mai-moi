import { beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  enqueueOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'
import { pendingPetNumericId } from '@/offline/projections/pets'
import { remapPetLocalId } from './remap-pet-local-id'

describe('remap-pet-local-id', () => {
  beforeEach(async () => {
    await resetOperationsStoreForTests()
  })

  it('rewrites dependent operations from local pet ids to server ids', async () => {
    const localEntityId = 'pet-local-1'
    const localNumericId = pendingPetNumericId(localEntityId)

    await enqueueOperation({
      idempotencyKey: localEntityId,
      entityType: 'pet',
      entityId: localEntityId,
      operation: 'create',
      localEntityId,
      payload: { name: 'Offline', description: 'Cat', country: 'VN', pet_type_id: 1 },
    })

    await enqueueOperation({
      idempotencyKey: 'pet-update-1',
      entityType: 'pet',
      entityId: localNumericId,
      operation: 'update',
      payload: { petId: localNumericId, data: { description: 'Updated offline' } },
    })

    await enqueueOperation({
      idempotencyKey: 'weight-create-1',
      entityType: 'weight',
      entityId: localNumericId,
      operation: 'create',
      localEntityId: 'weight-local-1',
      payload: { weight_kg: 4.2, record_date: '2025-01-01' },
    })

    await remapPetLocalId(localEntityId, 99)

    const operations = await listOperations()
    const updateOperation = operations.find(
      (operation) => operation.idempotencyKey === 'pet-update-1'
    )
    const weightOperation = operations.find(
      (operation) => operation.idempotencyKey === 'weight-create-1'
    )

    expect(updateOperation?.payload).toEqual({
      petId: 99,
      data: { description: 'Updated offline' },
    })
    expect(weightOperation?.entityId).toBe(99)
  })
})
