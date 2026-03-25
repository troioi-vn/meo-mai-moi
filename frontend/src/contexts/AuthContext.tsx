import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  api,
  authApi,
  csrf,
  setUnauthorizedHandler,
  SKIP_UNAUTHORIZED_REDIRECT_HEADER,
} from '@/api/axios'
import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { AuthContext } from './auth-context'
import { clearOfflineCache } from '@/lib/query-cache'
import {
  putUsersMePassword as generatedPutPassword,
  deleteUsersMe as generatedDeleteAccount,
} from '@/api/generated/user-profile/user-profile'

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
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState<boolean>(!skipInitialLoad && initialLoading)
  const isRecoveringFromUnauthorizedRef = useRef(false)

  const clearAuthenticatedAppState = useCallback(async () => {
    await clearOfflineCache()
    setUser(null)
  }, [])

  const loadUser = useCallback(async () => {
    const requestConfig = {
      headers: {
        [SKIP_UNAUTHORIZED_REDIRECT_HEADER]: '1',
      },
    }

    try {
      // Add cache-busting to ensure fresh user data after cache clear/deployment
      const loadedUser = await api.get<User>('/users/me', requestConfig)
      setUser(loadedUser as unknown as User)
    } catch (error) {
      let clearedAuthState = false

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          // Re-prime CSRF cookie once in case browser/state drifted after OAuth redirect.
          await csrf()
          const retriedUser = await api.get<User>('/users/me', requestConfig)
          setUser(retriedUser as unknown as User)
          return
        } catch (retryError) {
          if (!axios.isAxiosError(retryError) || retryError.response?.status !== 401) {
            console.error('Error loading user after CSRF retry:', retryError)
          } else {
            await clearAuthenticatedAppState()
            clearedAuthState = true
          }
        }
      } else {
        console.error('Error loading user:', error)
      }

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (!clearedAuthState) {
          await clearAuthenticatedAppState()
        }
      } else {
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthenticatedAppState])

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

  const deleteAccount = useCallback(async (password: string) => {
    await generatedDeleteAccount({ password })
    await clearAuthenticatedAppState()
  }, [clearAuthenticatedAppState])

  useEffect(() => {
    if (!skipInitialLoad) {
      void loadUser()
    }
  }, [loadUser, skipInitialLoad])

  // Globally handle 401 responses by clearing auth state and redirecting to login
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => {
      void (async () => {
        if (isRecoveringFromUnauthorizedRef.current) {
          return
        }

        isRecoveringFromUnauthorizedRef.current = true

        try {
          // A single transient 401 should not immediately evict the user.
          // Re-prime CSRF and verify the session once before redirecting.
          await csrf()
          const recoveredUser = await api.get<User>('/users/me', {
            headers: {
              [SKIP_UNAUTHORIZED_REDIRECT_HEADER]: '1',
            },
          })
          setUser(recoveredUser as unknown as User)
          return
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            console.error('Error revalidating auth after 401:', error)
          }
        } finally {
          isRecoveringFromUnauthorizedRef.current = false
        }

        await clearAuthenticatedAppState()
        const { pathname, search, hash } = window.location

        // Avoid redirect loops and don't redirect from public pages
        const publicPaths = [
          '/login',
          '/register',
          '/forgot-password',
          '/password/reset',
          '/email/verify',
          '/requests',
        ]
        const isPublicPath =
          pathname === '/' || publicPaths.some((path) => pathname.startsWith(path))

        if (isPublicPath) {
          return
        }

        const currentLocation = `${pathname}${search}${hash}`
        const redirectParam = encodeURIComponent(currentLocation || '/')
        window.location.assign(`/login?redirect=${redirectParam}`)
      })()
    }

    setUnauthorizedHandler(handler)
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearAuthenticatedAppState])

  // Refresh user data when service worker updates or app becomes visible
  // This ensures avatar and user data are fresh after cache clear/deployment
  useEffect(() => {
    if (skipInitialLoad || !user) {
      return
    }

    let lastRefreshTime = 0
    const MIN_REFRESH_INTERVAL = 5000 // Don't refresh more than once per 5 seconds

    const refreshUserIfNeeded = () => {
      const now = Date.now()
      if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
        return
      }
      lastRefreshTime = now
      void loadUser()
    }

    const handleVisibilityChange = () => {
      // Refresh user data when app becomes visible (useful after deployment/cache clear)
      if (document.visibilityState === 'visible') {
        refreshUserIfNeeded()
      }
    }

    const handleServiceWorkerUpdate = () => {
      // Refresh user data when service worker updates (indicates new deployment)
      refreshUserIfNeeded()
    }

    // Listen for visibility changes (less aggressive than focus events)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for service worker controller change (indicates SW update)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate)
      }
    }
  }, [loadUser, skipInitialLoad, user])

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
