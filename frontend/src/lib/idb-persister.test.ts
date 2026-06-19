import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'

// Mock idb-keyval
const mockStore = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    mockStore.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string) => {
    mockStore.delete(key)
    return Promise.resolve()
  }),
}))

import { set } from 'idb-keyval'
import { hasPersistedAuthenticatedQueryCache, persister } from './query-cache'
import type { PersistedClient } from '@tanstack/query-persist-client-core'

describe('IDB Persister', () => {
  beforeEach(() => {
    mockStore.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists and restores a client', async () => {
    const fakeClient = {
      timestamp: Date.now(),
      buster: '',
      clientState: { queries: [], mutations: [] },
    } satisfies PersistedClient

    await persister.persistClient(fakeClient)
    const restored = await persister.restoreClient()

    expect(restored).toEqual(fakeClient)
  })

  it('returns undefined when no client persisted', async () => {
    const restored = await persister.restoreClient()
    expect(restored).toBeUndefined()
  })

  it('removes persisted client', async () => {
    const fakeClient = {
      timestamp: Date.now(),
      buster: '',
      clientState: { queries: [], mutations: [] },
    } satisfies PersistedClient

    await persister.persistClient(fakeClient)
    await persister.removeClient()
    const restored = await persister.restoreClient()

    expect(restored).toBeUndefined()
  })

  it('detects auth-scoped persisted query cache', async () => {
    const fakeClient = {
      timestamp: Date.now(),
      buster: '',
      clientState: {
        queries: [{ queryKey: ['/my-pets'] }],
        mutations: [],
      },
    } as unknown as PersistedClient

    await persister.persistClient(fakeClient)

    await expect(hasPersistedAuthenticatedQueryCache()).resolves.toBe(true)
  })

  it('ignores expired auth-scoped persisted query cache', async () => {
    const fakeClient = {
      timestamp: Date.now() - 1000 * 60 * 60 * 25,
      buster: '',
      clientState: {
        queries: [{ queryKey: ['/my-pets'] }],
        mutations: [],
      },
    } as unknown as PersistedClient

    await persister.persistClient(fakeClient)

    await expect(hasPersistedAuthenticatedQueryCache()).resolves.toBe(false)
  })

  it('ignores malformed persisted query cache', async () => {
    await set('meo-query-cache', { timestamp: Date.now(), buster: '', clientState: {} })

    await expect(hasPersistedAuthenticatedQueryCache()).resolves.toBe(false)
  })

  it('ignores malformed persisted query entries', async () => {
    await set('meo-query-cache', {
      timestamp: Date.now(),
      buster: '',
      clientState: {
        queries: [{}, { queryKey: null }],
        mutations: [],
      },
    })

    await expect(hasPersistedAuthenticatedQueryCache()).resolves.toBe(false)
  })
})
