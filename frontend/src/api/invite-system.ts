import { api } from './axios'

export interface PublicSettings {
  invite_only_enabled: boolean
}

export interface WaitlistEntry {
  email: string
  status: string
  created_at: string
}

export interface InvitationValidation {
  valid: boolean
  inviter: {
    name: string
  }
  expires_at: string | null
}

export interface WaitlistCheckResult {
  email: string
  on_waitlist: boolean
  is_registered: boolean
  can_join_waitlist: boolean
}

/**
 * Get public settings including invite-only status
 */
export const getPublicSettings = async (): Promise<PublicSettings> => {
  return await api.get<PublicSettings>('/settings/public')
}

/**
 * Join the waitlist
 */
export const joinWaitlist = async (email: string): Promise<WaitlistEntry> => {
  return await api.post<WaitlistEntry>('/waitlist', { email })
}

/**
 * Check if email is on waitlist or registered
 */
export const checkWaitlistStatus = async (email: string): Promise<WaitlistCheckResult> => {
  return await api.post<WaitlistCheckResult>('/waitlist/check', { email })
}

/**
 * Validate an invitation code
 */
export const validateInvitationCode = async (code: string): Promise<InvitationValidation> => {
  return await api.post<InvitationValidation>('/invitations/validate', { code })
}

export interface Invitation {
  id: number
  code: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string | null
  created_at: string
  invitation_url: string
  recipient: {
    id: number
    name: string
    email: string
  } | null
}

export interface InvitationStats {
  total: number
  pending: number
  accepted: number
  expired: number
  revoked: number
}

/**
 * Get user's sent invitations
 */
export const getUserInvitations = async (): Promise<Invitation[]> => {
  return await api.get<Invitation[]>('/invitations')
}

/**
 * Generate a new invitation
 */
export const generateInvitation = async (expiresAt?: string): Promise<Invitation> => {
  const payload = expiresAt ? { expires_at: expiresAt } : {}
  return await api.post<Invitation>('/invitations', payload)
}

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (id: number): Promise<void> => {
  await api.delete(`/invitations/${String(id)}`)
}

/**
 * Get invitation statistics
 */
export const getInvitationStats = async (): Promise<InvitationStats> => {
  return await api.get<InvitationStats>('/invitations/stats')
}
