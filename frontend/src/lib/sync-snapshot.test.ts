import { onlineManager } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { QueryClient } from '@tanstack/react-query'
import { uploadMedia } from '@/lib/media-upload-service'
import {
  enqueueUpload,
  processQueue,
  resetMediaUploadQueueForTests,
} from '@/lib/media-upload-queue'
import { buildSyncSnapshot, listSyncTableRows } from '@/lib/sync-snapshot'
import {
  discardOperation,
  enqueueOperation,
  resetOperationsStoreForTests,
  retryFailedOperation,
  updateOperation,
} from '@/offline/operations'
vi.mock('@/lib/media-upload-service', () => ({
  uploadMedia: vi.fn(),
}))

const makeFile = (name = 'photo.jpg') => new File(['photo'], name, { type: 'image/jpeg' })

describe('sync snapshot', () => {
  let queryClient: QueryClient

  beforeEach(async () => {
    vi.clearAllMocks()
    onlineManager.setOnline(true)
    queryClient = new QueryClient()
    await resetMediaUploadQueueForTests()
    await resetOperationsStoreForTests()
  })

  it('counts queued uploads as active work without pending mutations', async () => {
    onlineManager.setOnline(false)
    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    const snapshot = buildSyncSnapshot(queryClient)

    expect(snapshot.queuedUploads).toBe(1)
    expect(snapshot.activeTotal).toBe(1)
    expect(snapshot.isDrained).toBe(false)
  })

  it('counts pending offline operations as active work', async () => {
    await enqueueOperation({
      idempotencyKey: 'idem-weight-1',
      entityType: 'weight',
      entityId: 1,
      operation: 'create',
      payload: { grams: 4200 },
    })

    const snapshot = buildSyncSnapshot(queryClient)

    expect(snapshot.pendingOperations).toBe(1)
    expect(snapshot.activeTotal).toBe(1)
  })

  it('counts failed offline pet operations as sync issues', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'idem-pet-failed',
      entityType: 'pet',
      entityId: 'local-pet-1',
      operation: 'create',
      localEntityId: 'local-pet-1',
      payload: { name: 'Mochi', description: 'Cat', country: 'VN', pet_type_id: 1 },
    })

    await updateOperation(operationId, {
      status: 'failed',
      lastError: 'Pet save failed',
    })

    const snapshot = buildSyncSnapshot(queryClient)
    const rows = listSyncTableRows(queryClient)

    expect(snapshot.failedOperations).toBe(1)
    expect(snapshot.issueTotal).toBe(1)
    expect(snapshot.hasIssues).toBe(true)
    expect(rows).toContainEqual(
      expect.objectContaining({
        kind: 'operation',
        domain: 'pet',
        status: 'failed',
        canRetry: true,
        canDiscard: true,
      })
    )
  })

  it('tracks failed uploads and operations separately from active work', async () => {
    onlineManager.setOnline(false)
    await enqueueUpload({
      target: { kind: 'pet-photo', petId: 1 },
      file: makeFile(),
    })

    const operationId = await enqueueOperation({
      idempotencyKey: 'idem-weight-failed',
      entityType: 'weight',
      entityId: 2,
      operation: 'create',
      payload: { grams: 4300 },
    })

    const conflictedId = await enqueueOperation({
      idempotencyKey: 'idem-weight-conflict',
      entityType: 'weight',
      entityId: 3,
      operation: 'update',
      payload: { grams: 4400 },
    })

    vi.mocked(uploadMedia).mockRejectedValue({
      response: { status: 422, data: { message: 'Invalid image' } },
    })
    onlineManager.setOnline(true)
    await processQueue()

    await updateOperation(operationId, { status: 'failed', lastError: 'Server unavailable' })
    await updateOperation(conflictedId, {
      status: 'conflicted',
      lastError: 'Version mismatch',
    })

    const snapshot = buildSyncSnapshot(queryClient)

    expect(snapshot.activeTotal).toBe(0)
    expect(snapshot.failedUploads).toBe(1)
    expect(snapshot.failedOperations).toBe(1)
    expect(snapshot.conflictedOperations).toBe(1)
    expect(snapshot.hasIssues).toBe(true)
    expect(snapshot.isDrained).toBe(true)
  })

  it('supports retry and discard recovery actions for failed operations', async () => {
    const operationId = await enqueueOperation({
      idempotencyKey: 'idem-weight-failed',
      entityType: 'weight',
      entityId: 2,
      operation: 'create',
      payload: { grams: 4300 },
    })

    await updateOperation(operationId, { status: 'failed', lastError: 'Server unavailable' })

    const rows = listSyncTableRows(queryClient)
    const failedOperation = rows.find((row) => row.kind === 'operation')

    expect(failedOperation).toMatchObject({
      canRetry: true,
      canDiscard: true,
      actionTargetId: operationId,
    })

    const retried = await retryFailedOperation(operationId)
    expect(retried?.status).toBe('pending')
    expect(buildSyncSnapshot(queryClient).failedOperations).toBe(0)

    await updateOperation(operationId, { status: 'failed', lastError: 'Server unavailable' })
    expect(await discardOperation(operationId)).toBe(true)
    expect(listSyncTableRows(queryClient).find((row) => row.kind === 'operation')).toBeUndefined()
  })

  it('only exposes conflict resolution actions when server conflict metadata is available', async () => {
    const idempotencyConflictId = await enqueueOperation({
      idempotencyKey: 'idem-generic-conflict',
      entityType: 'weight',
      entityId: 2,
      operation: 'update',
      payload: { petId: 1, weightId: 2, weight_kg: 5.5 },
    })

    await updateOperation(idempotencyConflictId, {
      status: 'conflicted',
      lastError: 'Idempotency conflict',
      conflictMetadata: {
        localAttemptedValue: { petId: 1, weightId: 2, weight_kg: 5.5 },
        operationId: idempotencyConflictId,
        idempotencyKey: 'idem-generic-conflict',
      },
    })

    const versionConflictId = await enqueueOperation({
      idempotencyKey: 'idem-version-conflict',
      entityType: 'weight',
      entityId: 3,
      operation: 'update',
      payload: { petId: 1, weightId: 3, weight_kg: 6.5 },
    })

    await updateOperation(versionConflictId, {
      status: 'conflicted',
      lastError: 'Version conflict',
      conflictMetadata: {
        localAttemptedValue: { petId: 1, weightId: 3, weight_kg: 6.5 },
        serverValue: { weight_kg: '6.00' },
        clientBaseVersion: '2024-01-01T00:00:00.000000Z',
        serverVersion: '2024-02-01T00:00:00.000000Z',
        operationId: versionConflictId,
        idempotencyKey: 'idem-version-conflict',
      },
    })

    const rows = listSyncTableRows(queryClient)
    const idempotencyConflict = rows.find((row) => row.actionTargetId === idempotencyConflictId)
    const versionConflict = rows.find((row) => row.actionTargetId === versionConflictId)

    expect(idempotencyConflict).toMatchObject({
      canDiscard: true,
      canKeepMine: false,
      canUseServer: false,
    })
    expect(versionConflict).toMatchObject({
      canDiscard: true,
      canKeepMine: true,
      canUseServer: true,
    })
  })
})
