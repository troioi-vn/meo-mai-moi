import { describe, expect, it, beforeEach } from 'vite-plus/test'
import {
  enqueueOperation,
  listOperations,
  resetOperationsStoreForTests,
  updateOperation,
} from '@/offline/operations'
import { pendingWeightNumericId } from './weights'
import { resolveHabitDayMarker, resolveWeightMarker } from './sync-state'

describe('offline projection sync-state', () => {
  beforeEach(async () => {
    await resetOperationsStoreForTests()
  })

  it('marks pending weight creates and updates', async () => {
    await enqueueOperation({
      idempotencyKey: 'weight-create',
      entityType: 'weight',
      entityId: 9,
      operation: 'create',
      localEntityId: 'weight-create',
      payload: { weight_kg: 4, record_date: '2026-01-01' },
    })

    const operations = await listOperations()
    const createId = pendingWeightNumericId('weight-create')

    expect(resolveWeightMarker(createId, 9, operations)).toBe('pending')
  })

  it('marks failed deletes on the server row they attempted to remove', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'weight-delete',
      entityType: 'weight',
      entityId: 99,
      operation: 'delete',
      payload: { petId: 9, weightId: 99 },
    })

    await updateOperation(operationId, {
      status: 'failed',
      lastError: 'Server rejected delete',
    })

    expect(resolveWeightMarker(99, 9, await listOperations())).toBe('failed')
  })

  it('surfaces failed habit day entries by date', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'habit-day',
      entityType: 'habit',
      entityId: 3,
      operation: 'update',
      payload: {
        habitId: 3,
        date: '2026-05-01',
        entries: [{ pet_id: 1, value_int: 1 }],
      },
    })

    await updateOperation(operationId, {
      status: 'failed',
      lastError: 'network',
    })

    expect(resolveHabitDayMarker(3, '2026-05-01', await listOperations())).toBe('failed')
  })
})
