import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getPublicSettings,
  validateInvitationCode,
  type InvitationValidation,
} from '@/api/invite-system'

export type RegistrationMode = 'invite-only-no-code' | 'invite-only-with-code' | 'open-registration'

export interface InviteSystemState {
  mode: RegistrationMode
  isLoading: boolean
  inviteOnlyEnabled: boolean
  invitationCode: string | null
  invitationValidation: InvitationValidation | null
  error: string | null
}

export const useInviteSystem = () => {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<InviteSystemState>({
    mode: 'open-registration',
    isLoading: true,
    inviteOnlyEnabled: false,
    invitationCode: null,
    invitationValidation: null,
    error: null,
  })

  useEffect(() => {
    const initializeInviteSystem = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))

        // Get invitation code from URL
        const invitationCode = searchParams.get('invitation_code')

        // Get public settings
        const settings = await getPublicSettings()
        const inviteOnlyEnabled = settings.invite_only_enabled

        let mode: RegistrationMode = 'open-registration'
        let invitationValidation: InvitationValidation | null = null

        if (inviteOnlyEnabled) {
          if (invitationCode) {
            // Validate the invitation code
            try {
              invitationValidation = await validateInvitationCode(invitationCode)
              mode = 'invite-only-with-code'
            } catch (error) {
              console.error('Invalid invitation code:', error)
              mode = 'invite-only-no-code'
              setState((prev) => ({
                ...prev,
                error: 'Invalid or expired invitation code. You can join the waitlist instead.',
              }))
            }
          } else {
            mode = 'invite-only-no-code'
          }
        }

        setState((prev) => ({
          ...prev,
          mode,
          isLoading: false,
          inviteOnlyEnabled,
          invitationCode,
          invitationValidation,
        }))
      } catch (error) {
        console.error('Failed to initialize invite system:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load registration settings. Please try again.',
        }))
      }
    }

    void initializeInviteSystem()
  }, [searchParams])

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }))
  }

  return {
    ...state,
    clearError,
  }
}
