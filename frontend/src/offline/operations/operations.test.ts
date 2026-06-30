import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  clearOperations,
  enqueueOperation,
  getOperation,
  getOperationCountSnapshot,
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
})
