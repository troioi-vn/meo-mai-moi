import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  clearAuthRecoveryHints,
  clearCachedAuthIdentity,
  getCachedAuthIdentity,
  hasCachedAuthIdentity,
  hasRecoverableAuthSession,
  setCachedAuthIdentity,
  setPersistedAuthCacheHint,
  syncCachedAuthIdentity,
} from './auth-identity-cache'

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
    clearCachedAuthIdentity()

    expect(getCachedAuthIdentity()).toBeNull()
  })

  it('clears offline cache when cached identity changes', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')

    await syncCachedAuthIdentity(2, onIdentityChanged)

    expect(onIdentityChanged).toHaveBeenCalledOnce()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBe('2')
  })

  it('does not clear offline cache when cached identity stays the same', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')

    await syncCachedAuthIdentity(1, onIdentityChanged)

    expect(onIdentityChanged).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBe('1')
  })

  it('clears offline cache when identity is removed', async () => {
    const onIdentityChanged = vi.fn().mockResolvedValue(undefined)
    setCachedAuthIdentity('1')

    await syncCachedAuthIdentity(null, onIdentityChanged)

    expect(onIdentityChanged).toHaveBeenCalledOnce()
    expect(getCachedAuthIdentity()).toBeNull()
  })

  it('treats persisted auth cache hint as a recoverable session', () => {
    expect(hasRecoverableAuthSession()).toBe(false)

    setPersistedAuthCacheHint(true)

    expect(hasRecoverableAuthSession()).toBe(true)
  })
})
