import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import {
  AUTH_RECOVERY_WINDOW_MS,
  clearAuthRecovery,
  createAuthRecoveryState,
  isAuthRecoveryActive,
  scheduleAuthRecoveryRetry,
  shouldKeepLoadingForStartupError,
  startOrContinueAuthRecovery,
} from './auth-recovery'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  clearAuthRecoveryHints,
  setPersistedAuthCacheHint,
} from './auth-identity-cache'

describe('auth-recovery', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearAuthRecoveryHints()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts a recovery window on first failure', () => {
    const state = createAuthRecoveryState()
    const now = Date.now()

    expect(startOrContinueAuthRecovery(state, now)).toBe(true)
    expect(state.recoveryUntil).toBe(now + AUTH_RECOVERY_WINDOW_MS)
    expect(isAuthRecoveryActive(state, now)).toBe(true)
  })

  it('returns false after the recovery window expires', () => {
    const state = createAuthRecoveryState()
    const now = Date.now()

    startOrContinueAuthRecovery(state, now)

    expect(startOrContinueAuthRecovery(state, now + AUTH_RECOVERY_WINDOW_MS)).toBe(false)
    expect(isAuthRecoveryActive(state, now + AUTH_RECOVERY_WINDOW_MS)).toBe(false)
  })

  it('clears recovery state and scheduled retries', () => {
    const state = createAuthRecoveryState()
    const callback = vi.fn()

    startOrContinueAuthRecovery(state)
    scheduleAuthRecoveryRetry(state, callback)

    expect(state.scheduledRecoveryTimeoutId).not.toBeNull()

    clearAuthRecovery(state)

    expect(state.recoveryUntil).toBe(0)
    expect(state.scheduledRecoveryTimeoutId).toBeNull()
    vi.runAllTimers()
    expect(callback).not.toHaveBeenCalled()
  })

  it('schedules a single recovery retry during the recovery window', () => {
    const state = createAuthRecoveryState()
    const callback = vi.fn()

    startOrContinueAuthRecovery(state)
    scheduleAuthRecoveryRetry(state, callback)
    scheduleAuthRecoveryRetry(state, callback)

    expect(state.scheduledRecoveryTimeoutId).not.toBeNull()

    vi.advanceTimersByTime(1000)

    expect(callback).toHaveBeenCalledOnce()
    expect(state.scheduledRecoveryTimeoutId).toBeNull()
  })

  it('keeps loading for network errors when cached identity exists', () => {
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, '1')
    const state = createAuthRecoveryState()
    const error = { isAxiosError: true, request: {}, message: 'Network Error' }

    expect(shouldKeepLoadingForStartupError(error, state)).toBe(true)
    expect(isAuthRecoveryActive(state)).toBe(true)
  })

  it('does not extend the original recovery window on repeated transient errors', () => {
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, '1')
    const state = createAuthRecoveryState()
    const error = { isAxiosError: true, request: {}, message: 'Network Error' }
    const now = Date.now()

    expect(shouldKeepLoadingForStartupError(error, state, now)).toBe(true)
    expect(state.recoveryUntil).toBe(now + AUTH_RECOVERY_WINDOW_MS)

    expect(shouldKeepLoadingForStartupError(error, state, now + 1000)).toBe(true)
    expect(state.recoveryUntil).toBe(now + AUTH_RECOVERY_WINDOW_MS)

    expect(shouldKeepLoadingForStartupError(error, state, now + AUTH_RECOVERY_WINDOW_MS)).toBe(
      false
    )
  })

  it('does not keep loading for startup errors without cached identity', () => {
    const state = createAuthRecoveryState()
    const error = { isAxiosError: true, request: {}, message: 'Network Error' }

    expect(shouldKeepLoadingForStartupError(error, state)).toBe(false)
  })

  it('keeps loading for startup errors when persisted auth cache hint is set', () => {
    setPersistedAuthCacheHint(true)
    const state = createAuthRecoveryState()
    const error = { isAxiosError: true, request: {}, message: 'Network Error' }

    expect(shouldKeepLoadingForStartupError(error, state)).toBe(true)
  })
})
