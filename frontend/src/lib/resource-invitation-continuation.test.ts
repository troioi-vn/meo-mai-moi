import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearPendingResourceInvitationToken,
  invitePath,
  readPendingResourceInvitationToken,
  savePendingResourceInvitationToken,
} from './resource-invitation-continuation'

describe('resource-invitation-continuation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and reads the resource invitation token', () => {
    savePendingResourceInvitationToken('abc')
    expect(readPendingResourceInvitationToken()).toBe('abc')
    clearPendingResourceInvitationToken()
    expect(readPendingResourceInvitationToken()).toBeNull()
  })

  it('migrates the legacy pendingInviteToken once', () => {
    localStorage.setItem('pendingInviteToken', 'legacy-token')
    expect(readPendingResourceInvitationToken()).toBe('legacy-token')
    expect(localStorage.getItem('pendingInviteToken')).toBeNull()
    expect(localStorage.getItem('pendingResourceInvitationToken')).toBe('legacy-token')
  })

  it('builds the invite path', () => {
    expect(invitePath('tok')).toBe('/invite/tok')
  })
})
