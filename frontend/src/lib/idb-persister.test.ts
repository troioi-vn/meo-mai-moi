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

import { persister } from './query-cache'
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
})
