import { hasPersistedAuthenticatedQueryCache } from '@/lib/query-cache'
import type { User } from '@/types/user'

export const ACTIVE_AUTH_USER_ID_STORAGE_KEY = 'meo-active-auth-user-id'
export const CACHED_AUTH_USER_STORAGE_KEY = 'meo-cached-auth-user'
export const CACHED_AUTH_USER_VERSION = 1
export const CACHED_AUTH_USER_MAX_AGE_MS = 1000 * 60 * 60 * 24

interface CachedAuthUserEnvelope {
  v: number
  user: User
  cachedAt: number
}

let persistedAuthCacheHint = false

export function getCachedAuthIdentity(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)
}

export function hasCachedAuthIdentity(): boolean {
  return getCachedAuthIdentity() !== null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string'
  )
}

function isCachedAuthUserEnvelope(value: unknown): value is CachedAuthUserEnvelope {
  return (
    isRecord(value) &&
    value.v === CACHED_AUTH_USER_VERSION &&
    typeof value.cachedAt === 'number' &&
    isUser(value.user)
  )
}

export function readCachedAuthUser(now = Date.now()): User | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(CACHED_AUTH_USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isCachedAuthUserEnvelope(parsed)) {
      return null
    }

    if (now - parsed.cachedAt > CACHED_AUTH_USER_MAX_AGE_MS) {
      return null
    }

    return parsed.user
  } catch {
    return null
  }
}

export function writeCachedAuthUser(user: User): void {
  if (typeof window === 'undefined') {
    return
  }

  const envelope: CachedAuthUserEnvelope = {
    v: CACHED_AUTH_USER_VERSION,
    user,
    cachedAt: Date.now(),
  }

  window.localStorage.setItem(CACHED_AUTH_USER_STORAGE_KEY, JSON.stringify(envelope))
}

export function clearCachedAuthUser(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(CACHED_AUTH_USER_STORAGE_KEY)
}

export function buildIdOnlyFallbackUser(): User | null {
  const cachedId = getCachedAuthIdentity()
  if (cachedId === null) {
    return null
  }

  const id = Number(cachedId)
  if (!Number.isFinite(id)) {
    return null
  }

  return {
    id,
    name: '',
    email: '',
  }
}

/** Minimal user for offline sessions backed only by persisted pet query cache. */
export function buildOfflinePlaceholderUser(): User {
  return buildIdOnlyFallbackUser() ?? { id: 0, name: '', email: '' }
}

export function getRecoverableCachedUser(): User | null {
  return readCachedAuthUser() ?? buildIdOnlyFallbackUser()
}

export function hasRecoverableAuthSession(): boolean {
  return getRecoverableCachedUser() !== null || persistedAuthCacheHint
}

export async function resolveAuthRecoveryHints(): Promise<boolean> {
  if (hasCachedAuthIdentity()) {
    return true
  }

  const hasPersistedCache = await hasPersistedAuthenticatedQueryCache()
  persistedAuthCacheHint = hasPersistedCache
  return hasPersistedCache
}

export function clearAuthRecoveryHints(): void {
  persistedAuthCacheHint = false
}

export function setPersistedAuthCacheHint(value: boolean): void {
  persistedAuthCacheHint = value
}

export function setCachedAuthIdentity(userId: number | string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(userId))
}

export function clearCachedAuthIdentity(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)
  clearCachedAuthUser()
}

export async function syncCachedAuthIdentity(
  nextUser: User | null,
  onIdentityChanged: () => Promise<void>
): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedUserId = nextUser === null ? null : String(nextUser.id)
  const previousUserId = getCachedAuthIdentity()

  if (previousUserId !== normalizedUserId) {
    await onIdentityChanged()
  }

  if (nextUser === null) {
    clearCachedAuthIdentity()
    return
  }

  setCachedAuthIdentity(nextUser.id)
  writeCachedAuthUser(nextUser)
}
