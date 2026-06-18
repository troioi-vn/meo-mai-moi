export const ACTIVE_AUTH_USER_ID_STORAGE_KEY = 'meo-active-auth-user-id'

export function getCachedAuthIdentity(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)
}

export function hasCachedAuthIdentity(): boolean {
  return getCachedAuthIdentity() !== null
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
}

export async function syncCachedAuthIdentity(
  nextUserId: number | string | null,
  onIdentityChanged: () => Promise<void>
): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedUserId = nextUserId === null ? null : String(nextUserId)
  const previousUserId = getCachedAuthIdentity()

  if (previousUserId !== normalizedUserId) {
    await onIdentityChanged()
  }

  if (normalizedUserId === null) {
    clearCachedAuthIdentity()
    return
  }

  setCachedAuthIdentity(normalizedUserId)
}
