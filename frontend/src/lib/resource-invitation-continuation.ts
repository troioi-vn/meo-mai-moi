/**
 * Auth continuation for shareable resource invitation links.
 * Legacy key `pendingInviteToken` is read once and migrated.
 */
export const PENDING_RESOURCE_INVITATION_TOKEN_KEY = 'pendingResourceInvitationToken'
const LEGACY_PENDING_INVITE_TOKEN_KEY = 'pendingInviteToken'

export function invitePath(token: string): string {
  return `/invite/${token}`
}

export function readPendingResourceInvitationToken(): string | null {
  const current = localStorage.getItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY)
  if (current) {
    return current
  }

  const legacy = localStorage.getItem(LEGACY_PENDING_INVITE_TOKEN_KEY)
  if (legacy) {
    localStorage.setItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY, legacy)
    localStorage.removeItem(LEGACY_PENDING_INVITE_TOKEN_KEY)
    return legacy
  }

  return null
}

export function savePendingResourceInvitationToken(token: string): void {
  localStorage.setItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY, token)
  localStorage.removeItem(LEGACY_PENDING_INVITE_TOKEN_KEY)
}

export function clearPendingResourceInvitationToken(): void {
  localStorage.removeItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY)
  localStorage.removeItem(LEGACY_PENDING_INVITE_TOKEN_KEY)
}
