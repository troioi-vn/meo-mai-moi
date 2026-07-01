import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'
import { clear, createStore, keys } from 'idb-keyval'
import { dehydrate } from '@tanstack/react-query'
import type { User } from '@/types/user'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  CACHED_AUTH_USER_STORAGE_KEY,
  setCachedAuthIdentity,
  syncCachedAuthIdentity,
  writeCachedAuthUser,
} from '@/lib/auth-identity-cache'
import { clearAuthenticatedOfflineData } from '@/lib/authenticated-offline-cleanup'
import {
  createPreviewUrl,
  enqueueUpload,
  listUploadsSnapshot,
  resetMediaUploadQueueForTests,
} from '@/lib/media-upload-queue'
import { clearOfflineCache, persister, persistOptions, queryClient } from '@/lib/query-cache'
import { getGetMyPetsQueryKey } from '@/api/generated/pets/pets'
import {
  enqueueOperation,
  listOperations,
  resetOperationsStoreForTests,
} from '@/offline/operations'

const mediaStore = createStore('meo-media-uploads', 'items')
const operationsStore = createStore('meo-offline-operations', 'items')

const userA: User = {
  id: 1,
  name: 'User A',
  email: 'user-a@example.com',
}

const userB: User = {
  id: 2,
  name: 'User B',
  email: 'user-b@example.com',
}

const makeFile = () => new File(['private-photo'], 'secret.jpg', { type: 'image/jpeg' })

async function seedUserAPrivateOfflineState() {
  setCachedAuthIdentity(userA.id)
  writeCachedAuthUser(userA)

  queryClient.setQueryData(getGetMyPetsQueryKey(), {
    data: [{ id: 99, name: 'User A Pet' }],
  })
  await persister.persistClient({
    timestamp: Date.now(),
    buster: '',
    clientState: dehydrate(queryClient, persistOptions.dehydrateOptions),
  })

  await enqueueUpload({
    target: { kind: 'pet-photo', petId: 99 },
    file: makeFile(),
  })

  await enqueueOperation({
    idempotencyKey: 'user-a-weight-create',
    entityType: 'weight',
    entityId: 99,
    operation: 'create',
    payload: { grams: 4200 },
  })
}

async function expectPrivateOfflineStoresEmpty() {
  expect(await persister.restoreClient()).toBeUndefined()
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  expect(listUploadsSnapshot()).toEqual([])
  expect(await listOperations()).toEqual([])
  expect(await keys(mediaStore)).toEqual([])
  expect(await keys(operationsStore)).toEqual([])
}

async function expectAllPrivateStoresEmpty() {
  await expectPrivateOfflineStoresEmpty()
  expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBeNull()
  expect(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)).toBeNull()
}

describe('authenticated private-data cleanup', () => {
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:user-a-preview')
    revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    onlineManager.setOnline(false)
    window.localStorage.clear()
    await resetMediaUploadQueueForTests()
    await resetOperationsStoreForTests()
    await clearOfflineCache()
    await clear(mediaStore)
    await clear(operationsStore)
  })

  it('clears query cache, media blobs, operations, and auth identity on logout cleanup', async () => {
    await seedUserAPrivateOfflineState()

    const uploadId = listUploadsSnapshot()[0]?.id
    expect(uploadId).toBeDefined()
    expect(createPreviewUrl(uploadId!)).toBe('blob:user-a-preview')
    expect(await listOperations()).toHaveLength(1)

    await clearAuthenticatedOfflineData()

    await expectAllPrivateStoresEmpty()
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:user-a-preview')
  })

  it('does not leak user A private offline state after switching to user B', async () => {
    await seedUserAPrivateOfflineState()

    const uploadId = listUploadsSnapshot()[0]?.id
    expect(uploadId).toBeDefined()
    expect(createPreviewUrl(uploadId!)).toBe('blob:user-a-preview')

    await syncCachedAuthIdentity(userB, clearAuthenticatedOfflineData)

    await expectPrivateOfflineStoresEmpty()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBe('2')
    expect(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)).toContain(
      'user-b@example.com'
    )
    expect(createPreviewUrl(uploadId!)).toBe('')
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:user-a-preview')
  })
})
