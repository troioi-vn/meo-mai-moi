import axios from 'axios'
import { hasCachedAuthIdentity } from '@/lib/auth-identity-cache'

export const AUTH_RECOVERY_WINDOW_MS = 15_000
export const TRANSIENT_AUTH_ERROR_STATUSES = new Set([408, 419, 425, 429])

export interface AuthRecoveryState {
  recoveryUntil: number
  scheduledRecoveryTimeoutId: number | null
}

export function createAuthRecoveryState(): AuthRecoveryState {
  return {
    recoveryUntil: 0,
    scheduledRecoveryTimeoutId: null,
  }
}

export function isAuthRecoveryActive(state: AuthRecoveryState, now = Date.now()): boolean {
  return state.recoveryUntil > now
}

export function startOrContinueAuthRecovery(state: AuthRecoveryState, now = Date.now()): boolean {
  if (state.recoveryUntil === 0) {
    state.recoveryUntil = now + AUTH_RECOVERY_WINDOW_MS
  }

  return state.recoveryUntil > now
}

export function clearAuthRecovery(state: AuthRecoveryState): void {
  state.recoveryUntil = 0

  if (state.scheduledRecoveryTimeoutId !== null && typeof window !== 'undefined') {
    window.clearTimeout(state.scheduledRecoveryTimeoutId)
    state.scheduledRecoveryTimeoutId = null
  }
}

export function shouldKeepLoadingForStartupError(
  error: unknown,
  state: AuthRecoveryState,
  now = Date.now()
): boolean {
  if (!hasCachedAuthIdentity()) {
    return false
  }

  if (!axios.isAxiosError(error)) {
    return false
  }

  const status = error.response?.status
  if (status === undefined || status >= 500 || TRANSIENT_AUTH_ERROR_STATUSES.has(status)) {
    return startOrContinueAuthRecovery(state, now)
  }

  return false
}

export function scheduleAuthRecoveryRetry(
  state: AuthRecoveryState,
  callback: () => void,
  delayMs = 1000
): void {
  if (!isAuthRecoveryActive(state)) {
    return
  }

  if (state.scheduledRecoveryTimeoutId !== null || typeof window === 'undefined') {
    return
  }

  state.scheduledRecoveryTimeoutId = window.setTimeout(() => {
    state.scheduledRecoveryTimeoutId = null
    callback()
  }, delayMs)
}
