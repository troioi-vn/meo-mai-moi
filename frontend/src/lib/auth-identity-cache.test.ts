import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  CACHED_AUTH_USER_MAX_AGE_MS,
  CACHED_AUTH_USER_STORAGE_KEY,
  CACHED_AUTH_USER_VERSION,
  buildIdOnlyFallbackUser,
  clearAuthRecoveryHints,
  clearCachedAuthIdentity,
  clearCachedAuthUser,
  getCachedAuthIdentity,
  getRecoverableCachedUser,
  hasCachedAuthIdentity,
  hasRecoverableAuthSession,
  readCachedAuthUser,
  setCachedAuthIdentity,
  setPersistedAuthCacheHint,
  syncCachedAuthIdentity,
  writeCachedAuthUser,
} from './auth-identity-cache'
import type { User } from '@/types/user'

const user: User = {
  id: 1,
  name: 'Ada',
  email: 'ada@example.com',
  email_verified_at: '2026-01-01T00:00:00Z',
  is_banned: false,
  roles: ['user'],
}

describe('auth-identity-cache', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearAuthRecoveryHints()
  })

  it('returns null when no identity is cached', () => {
    expect(getCachedAuthIdentity()).toBeNull()
    expect(hasCachedAuthIdentity()).toBe(false)
  })

  it('stores and reads cached identity', () => {
    setCachedAuthIdentity(42)

    expect(getCachedAuthIdentity()).toBe('42')
    expect(hasCachedAuthIdentity()).toBe(true)
  })

  it('clears cached identity', () => {
    setCachedAuthIdentity(1)
    writeCachedAuthUser(user)

    clearCachedAuthIdentity()

    expect(getCachedAuthIdentity()).toBeNull()
    expect(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)).toBeNull()
  })

  it('round-trips a cached auth user with envelope metadata', () => {
    const beforeWrite = Date.now()

    writeCachedAuthUser(user)

    const envelope = JSON.parse(window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY) ?? '{}')
    expect(readCachedAuthUser()).toEqual(user)
    expect(envelope.v).toBe(CACHED_AUTH_USER_VERSION)
    expect(envelope.user).toEqual(user)
    expect(envelope.cachedAt).toBeGreaterThanOrEqual(beforeWrite)
    expect(envelope.cachedAt).toBeLessThanOrEqual(Date.now())
  })

  it('ignores expired cached auth users', () => {
    const cachedAt = Date.now() - CACHED_AUTH_USER_MAX_AGE_MS - 1
    window.localStorage.setItem(
      CACHED_AUTH_USER_STORAGE_KEY,
      JSON.stringify({ v: CACHED_AUTH_USER_VERSION, user, cachedAt })
    )

    expect(readCachedAuthUser()).toBeNull()
  })

  it('ignores version-mismatched cached auth users', () => {
    window.localStorage.setItem(
      CACHED_AUTH_USER_STORAGE_KEY,
      JSON.stringify({ v: CACHED_AUTH_USER_VERSION + 1, user, cachedAt: Date.now() })
    )

    expect(readCachedAuthUser()).toBeNull()
  })

  it('ignores malformed cached auth users', () => {
    window.localStorage.setItem(CACHED_AUTH_USER_STORAGE_KEY, '{nope')

    expect(readCachedAuthUser()).toBeNull()
  })

  it('builds an id-only fallback user from the legacy identity key', () => {
    setCachedAuthIdentity('7')

    expect(buildIdOnlyFallbackUser()).toEqual({ id: 7, name: '', email: '' })
  })

  it('prefers a full cached auth user over the id-only fallback', () => {
    setCachedAuthIdentity('7')
    writeCachedAuthUser(user)

    expect(getRecoverableCachedUser()).toEqual(user)
  })

  it('falls back to the id-only user when the full cached auth user is missing', () => {
    setCachedAuthIdentity('7')
    clearCachedAuthUser()

    expect(getRecoverableCachedUser()).toEqual({ id: 7, name: '', email: '' })
  })

  it('clears offline cache when cached identity changes', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')

    await syncCachedAuthIdentity({ ...user, id: 2 }, onIdentityChanged)

    expect(onIdentityChanged).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBe('2')
    expect(readCachedAuthUser()).toEqual({ ...user, id: 2 })
  })

  it('does not clear offline cache when cached identity stays the same', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')

    await syncCachedAuthIdentity(user, onIdentityChanged)

    expect(onIdentityChanged).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBe('1')
    expect(readCachedAuthUser()).toEqual(user)
  })

  it('clears offline cache when identity is removed', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')
    writeCachedAuthUser(user)

    await syncCachedAuthIdentity(null, onIdentityChanged)

    expect(onIdentityChanged).toHaveBeenCalledOnce()
    expect(getCachedAuthIdentity()).toBeNull()
    expect(readCachedAuthUser()).toBeNull()
  })

  it('treats persisted auth cache hint as a recoverable session', () => {
    expect(hasRecoverableAuthSession()).toBe(false)

    setPersistedAuthCacheHint(true)

    expect(hasRecoverableAuthSession()).toBe(true)
  })
})
