import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { QueryClient } from '@tanstack/react-query'
import {
  enqueueOperation,
  getOperation,
  resetOperationsStoreForTests,
  updateOperation,
} from '@/offline/operations'
import {
  acceptServerConflictVersion,
  conflictResolutionSupport,
  rebaseConflictedOperation,
} from './resolve-conflict'

describe('resolve-conflict', () => {
  beforeEach(async () => {
    await resetOperationsStoreForTests()
  })

  it('supports keep mine and use server only for simple update domains', () => {
    expect(conflictResolutionSupport('weight', 'update')).toEqual({
      canKeepMine: true,
      canUseServer: true,
    })
    expect(conflictResolutionSupport('medical_record', 'update')).toEqual({
      canKeepMine: false,
      canUseServer: false,
    })
  })

  it('rebases a conflicted operation onto the current server version with a fresh idempotency key', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'idem-conflict',
      entityType: 'weight',
      entityId: 3,
      operation: 'update',
      payload: { petId: 1, weightId: 3, weight_kg: 5.5 },
      baseVersion: '2024-01-01T00:00:00.000000Z',
    })

    await updateOperation(operationId, {
      status: 'conflicted',
      lastError: 'Version conflict',
      conflictMetadata: {
        localAttemptedValue: { petId: 1, weightId: 3, weight_kg: 5.5 },
        serverValue: { weight_kg: 4.2 },
        clientBaseVersion: '2024-01-01T00:00:00.000000Z',
        serverVersion: '2024-02-01T00:00:00.000000Z',
        operationId,
        idempotencyKey: 'idem-conflict',
      },
    })

    const updated = await rebaseConflictedOperation(operationId)

    expect(updated).toMatchObject({
      status: 'pending',
      baseVersion: '2024-02-01T00:00:00.000000Z',
      conflictMetadata: undefined,
      lastError: undefined,
    })
    expect(updated?.idempotencyKey).not.toBe('idem-conflict')
  })

  it('accepts the server version by removing the conflicted operation', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'idem-conflict-discard',
      entityType: 'weight',
      entityId: 3,
      operation: 'update',
      payload: { petId: 1, weightId: 3, weight_kg: 5.5 },
    })

    await updateOperation(operationId, {
      status: 'conflicted',
      lastError: 'Version conflict',
    })

    const queryClient = new QueryClient()
    expect(await acceptServerConflictVersion(queryClient, operationId)).toBe(true)
    expect(await getOperation(operationId)).toBeUndefined()
  })
})
