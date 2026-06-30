import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  clearOperations,
  enqueueOperation,
  getOperation,
  getOperationCountSnapshot,
  getOperationIssueCountSnapshot,
  getOperationIssuesSnapshot,
  getPendingOperationCountSnapshot,
  initializeOperationsStore,
  listOperations,
  removeOperation,
  resetOperationsStoreForTests,
  resetOperationsStoreMemoryForTests,
  subscribe,
  updateOperation,
} from './index'

const makeEnqueueInput = () => ({
  idempotencyKey: 'idem-1',
  entityType: 'weight' as const,
  entityId: 42,
  operation: 'create' as const,
  payload: { grams: 4500 },
})

describe('offline operations store', () => {
  beforeEach(async () => {
    await resetOperationsStoreForTests()
  })

  it('enqueues an operation with pending defaults', async () => {
    const id = await enqueueOperation(makeEnqueueInput())

    const operation = await getOperation(id)

    expect(operation).toMatchObject({
      id,
      idempotencyKey: 'idem-1',
      entityType: 'weight',
      entityId: 42,
      operation: 'create',
      payload: { grams: 4500 },
      status: 'pending',
      attempts: 0,
    })
    expect(operation?.createdAt).toEqual(operation?.updatedAt)
    expect(getOperationCountSnapshot()).toBe(1)
  })

  it('lists operations in createdAt order', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(300)
      .mockReturnValueOnce(400)

    const firstId = await enqueueOperation(makeEnqueueInput())
    const secondId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-2',
      entityId: 43,
    })

    const listed = await listOperations()

    expect(listed.map((operation) => operation.id)).toEqual([firstId, secondId])
    expect(listed[0]?.createdAt).toBeLessThan(listed[1]?.createdAt ?? 0)
  })

  it('updates an operation and bumps updatedAt', async () => {
    const id = await enqueueOperation(makeEnqueueInput())
    const before = await getOperation(id)

    const updated = await updateOperation(id, {
      status: 'failed',
      attempts: 2,
      lastError: 'Network down',
    })

    expect(updated).toMatchObject({
      status: 'failed',
      attempts: 2,
      lastError: 'Network down',
      createdAt: before?.createdAt,
    })
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(before?.updatedAt ?? 0)
  })

  it('returns undefined when updating or reading a missing operation', async () => {
    await expect(updateOperation('missing', { status: 'failed' })).resolves.toBeUndefined()
    await expect(getOperation('missing')).resolves.toBeUndefined()
  })

  it('removes a single operation', async () => {
    const id = await enqueueOperation(makeEnqueueInput())

    await removeOperation(id)

    expect(await getOperation(id)).toBeUndefined()
    expect(await listOperations()).toHaveLength(0)
    expect(getOperationCountSnapshot()).toBe(0)
  })

  it('clears all operations', async () => {
    await enqueueOperation(makeEnqueueInput())
    await enqueueOperation({ ...makeEnqueueInput(), idempotencyKey: 'idem-2' })

    const listener = vi.fn()
    subscribe(listener)
    listener.mockClear()

    await clearOperations()

    expect(await listOperations()).toHaveLength(0)
    expect(getOperationCountSnapshot()).toBe(0)
    expect(listener).toHaveBeenCalled()
  })

  it('notifies subscribers on changes', async () => {
    const listener = vi.fn()
    subscribe(listener)

    const id = await enqueueOperation(makeEnqueueInput())
    listener.mockClear()

    await updateOperation(id, { status: 'syncing' })
    await removeOperation(id)

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('persists operations through in-memory state reset', async () => {
    const id = await enqueueOperation(makeEnqueueInput())

    await resetOperationsStoreMemoryForTests()

    expect(getOperationCountSnapshot()).toBe(0)

    const restored = await getOperation(id)

    expect(restored).toMatchObject({
      id,
      entityType: 'weight',
      entityId: 42,
      payload: { grams: 4500 },
      status: 'pending',
    })
    expect(getOperationCountSnapshot()).toBe(1)
  })

  it('counts only operations that still need attention', async () => {
    const pendingId = await enqueueOperation(makeEnqueueInput())
    const syncingId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-syncing',
    })
    const failedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-failed',
    })
    const conflictedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-conflicted',
    })
    const syncedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-synced',
    })

    await updateOperation(syncingId, { status: 'syncing' })
    await updateOperation(failedId, { status: 'failed' })
    await updateOperation(conflictedId, { status: 'conflicted' })
    await updateOperation(syncedId, { status: 'synced' })

    expect(getPendingOperationCountSnapshot()).toBe(4)
    expect(getOperationCountSnapshot()).toBe(5)

    await removeOperation(pendingId)

    expect(getPendingOperationCountSnapshot()).toBe(3)
  })

  it('restores pending operation count after explicit initialization', async () => {
    await enqueueOperation(makeEnqueueInput())

    await resetOperationsStoreMemoryForTests()

    expect(getPendingOperationCountSnapshot()).toBe(0)

    await initializeOperationsStore()

    expect(getPendingOperationCountSnapshot()).toBe(1)
  })

  it('lists only failed and conflicted operations as sync issues', async () => {
    const pendingId = await enqueueOperation(makeEnqueueInput())
    const failedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-failed',
    })
    const conflictedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-conflicted',
    })
    const syncedId = await enqueueOperation({
      ...makeEnqueueInput(),
      idempotencyKey: 'idem-synced',
    })

    vi.spyOn(Date, 'now').mockReturnValueOnce(500).mockReturnValueOnce(600)

    await updateOperation(failedId, {
      status: 'failed',
      lastError: 'Server unavailable',
    })
    await updateOperation(conflictedId, {
      status: 'conflicted',
      lastError: 'Version mismatch',
    })
    await updateOperation(syncedId, { status: 'synced' })

    const issues = getOperationIssuesSnapshot()

    expect(getOperationIssueCountSnapshot()).toBe(2)
    expect(issues.map((operation) => operation.id)).toEqual([conflictedId, failedId])
    expect(issues[0]?.lastError).toBe('Version mismatch')
    expect(issues[1]?.lastError).toBe('Server unavailable')

    await removeOperation(failedId)

    expect(getOperationIssueCountSnapshot()).toBe(1)
    expect(getOperationIssuesSnapshot().map((operation) => operation.id)).toEqual([conflictedId])

    await removeOperation(conflictedId)
    await removeOperation(pendingId)
    await removeOperation(syncedId)

    expect(getOperationIssueCountSnapshot()).toBe(0)
    expect(getOperationIssuesSnapshot()).toEqual([])
  })
})
