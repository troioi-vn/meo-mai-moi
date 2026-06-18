import React, { useCallback, useState } from 'react'
import { authApi, csrf } from '@/api/axios'
import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { AuthContext } from './auth-context'
import {
  putUsersMePassword as generatedPutPassword,
  deleteUsersMe as generatedDeleteAccount,
} from '@/api/generated/user-profile/user-profile'
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap'
import { useAuthRefreshListeners } from '@/hooks/use-auth-refresh-listeners'

export { AuthContext }

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialLoading?: boolean
  skipInitialLoad?: boolean
}

export function AuthProvider({
  children,
  initialUser = null,
  initialLoading = true,
  skipInitialLoad = false,
}: AuthProviderProps) {
  const [user, setUser] = useState(initialUser)
  const [isLoading, setIsLoading] = useState(!skipInitialLoad && initialLoading)
  const [authRecoveryAttempt, setAuthRecoveryAttempt] = useState(0)

  const { loadUser, clearAuthenticatedAppState, recoveryStateRef } = useAuthBootstrap({
    skipInitialLoad,
    setUser,
    setIsLoading,
    setAuthRecoveryAttempt,
  })

  useAuthRefreshListeners({
    skipInitialLoad,
    user,
    authRecoveryAttempt,
    loadUser,
    recoveryStateRef,
  })

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    await csrf()
    const data = await authApi.post<RegisterResponse>('/register', payload)

    // Set user immediately (even if not yet verified) so header can show logout
    setUser(data.user)

    return data
  }, [])

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResponse> => {
      await csrf()
      const data = await authApi.post<LoginResponse>('/login', payload)

      // Laravel regenerates the session on login, which also rotates the XSRF cookie.
      // Re-prime it so immediate follow-up writes use the fresh token, but don't
      // turn a successful login into a client-side failure if this refresh flakes.
      try {
        await csrf()
      } catch (error) {
        console.warn('Post-login CSRF refresh failed:', error)
      }

      // Set user immediately from response
      setUser(data.user)

      // Fetch full profile (avatar, etc.) after auth cookie is set
      void loadUser()

      return data
    },
    [loadUser]
  )

  const logout = useCallback(async () => {
    // Prevent Telegram auto-auth from re-authenticating after explicit logout
    try {
      sessionStorage.setItem('telegram_auth_disabled', '1')
    } catch {
      // noop (private browsing)
    }
    await authApi.post('/logout')
    await clearAuthenticatedAppState()
  }, [clearAuthenticatedAppState])

  const changePassword = useCallback(
    async (current_password: string, new_password: string, new_password_confirmation: string) => {
      await generatedPutPassword({
        current_password,
        new_password,
        new_password_confirmation,
      })
    },
    []
  )

  const deleteAccount = useCallback(
    async (password: string) => {
      await generatedDeleteAccount({ password })
      await clearAuthenticatedAppState()
    },
    [clearAuthenticatedAppState]
  )

  const isAuthenticated = user !== null

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      register,
      login,
      logout,
      loadUser,
      changePassword,
      deleteAccount,
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      register,
      login,
      logout,
      loadUser,
      changePassword,
      deleteAccount,
    ]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
