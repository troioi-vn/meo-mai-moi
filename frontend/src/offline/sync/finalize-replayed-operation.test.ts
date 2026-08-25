import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { QueryClient } from '@tanstack/react-query'
import { flushPersistedQueryCache } from '@/lib/query-cache'
import {
  enqueueOperation,
  getOperation,
  resetOperationsStoreForTests,
  type OfflineOperation,
} from '@/offline/operations'
import { finalizeReplayedOperation } from './finalize-replayed-operation'

vi.mock('@/lib/query-cache', () => ({
  flushPersistedQueryCache: vi.fn(),
}))

async function enqueueReplayedOperation(): Promise<OfflineOperation> {
  const operationId = await enqueueOperation({
    idempotencyKey: 'finalize-replayed-operation-1',
    entityType: 'medical_record',
    entityId: 123,
    operation: 'create',
    localEntityId: 'finalize-replayed-operation-1',
    payload: {
      petId: 123,
      record_type: 'vet_visit',
      description: 'Annual checkup',
      record_date: '2024-01-01',
    },
  })

  const operation = await getOperation(operationId)
  if (!operation) {
    throw new Error('Failed to enqueue the operation under test')
  }

  return operation
}

describe('finalize-replayed-operation', () => {
  beforeEach(async () => {
    await resetOperationsStoreForTests()
    vi.mocked(flushPersistedQueryCache).mockReset()
    vi.mocked(flushPersistedQueryCache).mockResolvedValue(undefined)
  })

  it('refreshes and persists the server-backed cache before dropping the operation', async () => {
    const operation = await enqueueReplayedOperation()
    const steps: string[] = []

    vi.mocked(flushPersistedQueryCache).mockImplementation(async () => {
      steps.push(`flush:${(await getOperation(operation.id))?.status ?? 'gone'}`)
    })

    const queryClient = new QueryClient()
    await finalizeReplayedOperation(queryClient, operation, async () => {
      steps.push(`refresh:${(await getOperation(operation.id))?.status ?? 'gone'}`)
    })

    expect(steps).toEqual(['refresh:pending', 'flush:pending'])
    expect(flushPersistedQueryCache).toHaveBeenCalledWith(queryClient)
    expect(await getOperation(operation.id)).toBeUndefined()
  })

  it('keeps the operation queued when the refresh fails', async () => {
    const operation = await enqueueReplayedOperation()
    const queryClient = new QueryClient()

    await finalizeReplayedOperation(queryClient, operation, () =>
      Promise.reject(new Error('refresh failed'))
    )

    expect(flushPersistedQueryCache).not.toHaveBeenCalled()
    expect(await getOperation(operation.id)).toMatchObject({
      id: operation.id,
      attempts: 1,
      lastError: expect.stringContaining('refresh failed'),
    })
  })
})
