import React, { useCallback, useState } from 'react'
import { onlineManager } from '@tanstack/react-query'
import { authApi, csrf } from '@/api/axios'
import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { AuthContext, authStatusIsLoading, type AuthStatus } from '@/contexts/auth-context'
import {
  putUsersMePassword as generatedPutPassword,
  deleteUsersMe as generatedDeleteAccount,
} from '@/api/generated/user-profile/user-profile'
import { getRecoverableCachedUser } from '@/lib/auth-identity-cache'
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap'
import { useAuthRefreshListeners } from '@/hooks/use-auth-refresh-listeners'

export { AuthContext }

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: User | null
  initialLoading?: boolean
  initialStatus?: AuthStatus
  skipInitialLoad?: boolean
}

function resolveInitialStatus(
  skipInitialLoad: boolean,
  initialUser: User | null,
  initialLoading: boolean,
  initialStatus?: AuthStatus
): AuthStatus {
  if (initialStatus) {
    return initialStatus
  }

  if (!skipInitialLoad && initialLoading) {
    return 'unknown'
  }

  return initialUser ? 'authenticated' : 'anonymous'
}

function getSyncOfflineAuthState(
  skipInitialLoad: boolean,
  initialUser: User | null,
  initialStatus?: AuthStatus
): { user: User | null; status: AuthStatus } | null {
  if (skipInitialLoad || initialStatus || initialUser) {
    return null
  }

  if (typeof window === 'undefined' || onlineManager.isOnline()) {
    return null
  }

  const cachedUser = getRecoverableCachedUser()
  if (!cachedUser) {
    return null
  }

  return { user: cachedUser, status: 'authenticated' }
}

export function AuthProvider({
  children,
  initialUser = null,
  initialLoading = true,
  initialStatus,
  skipInitialLoad = false,
}: AuthProviderProps) {
  const syncOfflineAuth = getSyncOfflineAuthState(skipInitialLoad, initialUser, initialStatus)
  const [user, setUser] = useState(syncOfflineAuth?.user ?? initialUser)
  const [status, setStatus] = useState<AuthStatus>(
    () =>
      syncOfflineAuth?.status ??
      resolveInitialStatus(skipInitialLoad, initialUser, initialLoading, initialStatus)
  )
  const [authRecoveryAttempt, setAuthRecoveryAttempt] = useState(0)
  const [isSessionFromCache, setIsSessionFromCache] = useState(Boolean(syncOfflineAuth))

  const isLoading = authStatusIsLoading(status)
  const isAuthenticated = status === 'authenticated'
  const isRecovering = status === 'recovering'

  const { loadUser, clearAuthenticatedAppState, syncCachedIdentity, recoveryStateRef } =
    useAuthBootstrap({
      skipInitialLoad,
      setUser,
      setStatus,
      setAuthRecoveryAttempt,
      setIsSessionFromCache,
    })

  useAuthRefreshListeners({
    skipInitialLoad,
    user,
    authRecoveryAttempt,
    loadUser,
    recoveryStateRef,
  })

  const register = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResponse> => {
      await csrf()
      const data = await authApi.post<RegisterResponse>('/register', payload)

      await syncCachedIdentity(data.user)

      // Set user immediately (even if not yet verified) so header can show logout.
      setUser(data.user)
      setStatus('authenticated')

      return data
    },
    [syncCachedIdentity]
  )

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

      // Set user immediately from response.
      await syncCachedIdentity(data.user)
      setUser(data.user)
      setStatus('authenticated')

      // Fetch full profile (avatar, etc.) after auth cookie is set.
      void loadUser()

      return data
    },
    [loadUser, syncCachedIdentity]
  )

  const logout = useCallback(async () => {
    // Prevent Telegram auto-auth from re-authenticating after explicit logout.
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

  const value = React.useMemo(
    () => ({
      user,
      status,
      isLoading,
      isAuthenticated,
      isRecovering,
      isSessionFromCache,
      register,
      login,
      logout,
      loadUser,
      changePassword,
      deleteAccount,
    }),
    [
      user,
      status,
      isLoading,
      isAuthenticated,
      isRecovering,
      isSessionFromCache,
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
