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
  const { data } = await api.get<{ data: PublicSettings }>('/settings/public')
  return data.data
}

/**
 * Join the waitlist
 */
export const joinWaitlist = async (email: string): Promise<WaitlistEntry> => {
  const { data } = await api.post<{ data: WaitlistEntry }>('/waitlist', { email })
  return data.data
}

/**
 * Check if email is on waitlist or registered
 */
export const checkWaitlistStatus = async (email: string): Promise<WaitlistCheckResult> => {
  const { data } = await api.post<{ data: WaitlistCheckResult }>('/waitlist/check', { email })
  return data.data
}

/**
 * Validate an invitation code
 */
export const validateInvitationCode = async (code: string): Promise<InvitationValidation> => {
  const { data } = await api.post<{ data: InvitationValidation }>('/invitations/validate', { code })
  return data.data
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
  const { data } = await api.get<{ data: Invitation[] }>('/invitations')
  return data.data
}

/**
 * Generate a new invitation
 */
export const generateInvitation = async (expiresAt?: string): Promise<Invitation> => {
  const payload = expiresAt ? { expires_at: expiresAt } : {}
  const { data } = await api.post<{ data: Invitation }>('/invitations', payload)
  return data.data
}

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (id: number): Promise<void> => {
  await api.delete(`/invitations/${id}`)
}

/**
 * Get invitation statistics
 */
export const getInvitationStats = async (): Promise<InvitationStats> => {
  const { data } = await api.get<{ data: InvitationStats }>('/invitations/stats')
  return data.data
}