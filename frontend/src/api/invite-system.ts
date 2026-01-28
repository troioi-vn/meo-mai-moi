import { getSettingsPublic as generatedGetSettingsPublic } from './generated/settings/settings'
import {
  postWaitlist as generatedPostWaitlist,
  postWaitlistCheck as generatedPostWaitlistCheck,
} from './generated/waitlist/waitlist'
import {
  getInvitations as generatedGetInvitations,
  postInvitations as generatedPostInvitations,
  deleteInvitationsId as generatedDeleteInvitationsId,
  postInvitationsValidate as generatedPostInvitationsValidate,
  getInvitationsStats as generatedGetInvitationsStats,
} from './generated/invitations/invitations'
import type {
  GetSettingsPublic200 as PublicSettings,
  GetInvitations200Item as Invitation,
  GetInvitationsStats200 as InvitationStats,
  PostInvitationsValidate200 as InvitationValidation,
  PostWaitlistCheck200 as WaitlistCheckResult,
  PostWaitlist201Data as WaitlistEntry,
} from './generated/model'

export type {
  PublicSettings,
  Invitation,
  InvitationStats,
  InvitationValidation,
  WaitlistCheckResult,
  WaitlistEntry,
}

/**
 * Get public settings including invite-only status
 */
export const getPublicSettings = async (): Promise<PublicSettings> => {
  return await generatedGetSettingsPublic()
}

/**
 * Join the waitlist
 */
export const joinWaitlist = async (email: string): Promise<WaitlistEntry> => {
  return (await generatedPostWaitlist({ email })) as unknown as WaitlistEntry
}

/**
 * Check if email is on waitlist or registered
 */
export const checkWaitlistStatus = async (email: string): Promise<WaitlistCheckResult> => {
  return await generatedPostWaitlistCheck({ email })
}

/**
 * Validate an invitation code
 */
export const validateInvitationCode = async (code: string): Promise<InvitationValidation> => {
  return (await generatedPostInvitationsValidate({ code })) as unknown as InvitationValidation
}

/**
 * Get user's sent invitations
 */
export const getUserInvitations = async (): Promise<Invitation[]> => {
  return await generatedGetInvitations()
}

/**
 * Generate a new invitation
 */
export const generateInvitation = async (expiresAt?: string): Promise<Invitation> => {
  const payload = expiresAt ? { expires_at: expiresAt } : {}
  return (await generatedPostInvitations(payload)) as unknown as Invitation
}

/**
 * Revoke an invitation
 */
export const revokeInvitation = async (id: number): Promise<void> => {
  await generatedDeleteInvitationsId(id)
}

/**
 * Get invitation statistics
 */
export const getInvitationStats = async (): Promise<InvitationStats> => {
  return await generatedGetInvitationsStats()
}
