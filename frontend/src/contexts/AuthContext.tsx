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

const ACTIVE_AUTH_USER_ID_STORAGE_KEY = 'meo-active-auth-user-id'

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
  const isRecoveringFromUnauthorizedRef = useRef(false)
  const authRecoveryUntilRef = useRef(0)
  const scheduledRecoveryTimeoutRef = useRef<number | null>(null)

  const syncCachedIdentity = useCallback(async (nextUserId: number | string | null) => {
    if (typeof window === 'undefined') {
      return
    }

    const normalizedUserId = nextUserId === null ? null : String(nextUserId)
    const previousUserId = window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)

    if (previousUserId !== normalizedUserId) {
      await clearOfflineCache()
    }

    if (normalizedUserId === null) {
      window.localStorage.removeItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, normalizedUserId)
  }, [])

  const clearAuthenticatedAppState = useCallback(async () => {
    await clearOfflineCache()
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)
    }
    setUser(null)
  }, [])

  const markAuthRecoveryNeeded = useCallback(() => {
    authRecoveryUntilRef.current = Date.now() + 15_000
  }, [])

  const clearAuthRecovery = useCallback(() => {
    authRecoveryUntilRef.current = 0
    if (scheduledRecoveryTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(scheduledRecoveryTimeoutRef.current)
      scheduledRecoveryTimeoutRef.current = null
    }
  }, [])

  const loadUser = useCallback(async () => {
    const requestConfig = {
      headers: {
        [SKIP_UNAUTHORIZED_REDIRECT_HEADER]: '1',
      },
    }

    try {
      const loadedUser = await api.get<User>('/users/me', {
        ...requestConfig,
        params: {
          _auth_identity: Date.now(),
        },
      })
      await syncCachedIdentity(loadedUser.id)
      clearAuthRecovery()
      setUser(loadedUser as unknown as User)
    } catch (error) {
      let clearedAuthState = false

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          // Re-prime CSRF cookie once in case browser/state drifted after OAuth redirect.
          await csrf()
          const retriedUser = await api.get<User>('/users/me', requestConfig)
          clearAuthRecovery()
          setUser(retriedUser as unknown as User)
          return
        } catch (retryError) {
          if (!axios.isAxiosError(retryError) || retryError.response?.status !== 401) {
            console.error('Error loading user after CSRF retry:', retryError)
          } else {
            markAuthRecoveryNeeded()
            await clearAuthenticatedAppState()
            clearedAuthState = true
          }
        }
      } else {
        clearAuthRecovery()
        console.error('Error loading user:', error)
      }

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (!clearedAuthState) {
          markAuthRecoveryNeeded()
          await clearAuthenticatedAppState()
        }
      } else {
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthenticatedAppState, clearAuthRecovery, markAuthRecoveryNeeded, syncCachedIdentity])

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
          clearAuthRecovery()
          setUser(recoveredUser as unknown as User)
          return
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            console.error('Error revalidating auth after 401:', error)
          }
        } finally {
          isRecoveringFromUnauthorizedRef.current = false
        }

        markAuthRecoveryNeeded()
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
  }, [clearAuthenticatedAppState, clearAuthRecovery, markAuthRecoveryNeeded])

  // Refresh user data when service worker updates or app becomes visible
  // This ensures avatar and user data are fresh after cache clear/deployment
  useEffect(() => {
    if (skipInitialLoad) {
      return
    }

    let lastRefreshTime = 0
    const MIN_REFRESH_INTERVAL = 5000 // Don't refresh more than once per 5 seconds
    const shouldAttemptAuthRecovery = () => authRecoveryUntilRef.current > Date.now()

    const refreshUserIfNeeded = () => {
      if (!user && !shouldAttemptAuthRecovery()) {
        return
      }

      const now = Date.now()
      if (now - lastRefreshTime < MIN_REFRESH_INTERVAL) {
        return
      }
      lastRefreshTime = now
      void loadUser()
    }

    const scheduleStartupRecovery = () => {
      if (!shouldAttemptAuthRecovery()) {
        return
      }
      if (scheduledRecoveryTimeoutRef.current !== null || typeof window === 'undefined') {
        return
      }

      scheduledRecoveryTimeoutRef.current = window.setTimeout(() => {
        scheduledRecoveryTimeoutRef.current = null
        refreshUserIfNeeded()
      }, 1000)
    }

    const handleVisibilityChange = () => {
      // Refresh user data when app becomes visible (useful after deployment/cache clear)
      if (document.visibilityState === 'visible') {
        refreshUserIfNeeded()
      }
    }

    const handlePageShow = () => {
      refreshUserIfNeeded()
    }

    const handleWindowFocus = () => {
      refreshUserIfNeeded()
    }

    const handleOnline = () => {
      refreshUserIfNeeded()
    }

    const handleServiceWorkerUpdate = () => {
      // Refresh user data when service worker updates (indicates new deployment)
      refreshUserIfNeeded()
    }

    // Listen for visibility changes (less aggressive than focus events)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('online', handleOnline)

    // Listen for service worker controller change (indicates SW update)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate)
    }

    scheduleStartupRecovery()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('online', handleOnline)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate)
      }
      if (scheduledRecoveryTimeoutRef.current !== null) {
        window.clearTimeout(scheduledRecoveryTimeoutRef.current)
        scheduledRecoveryTimeoutRef.current = null
      }
    }
  }, [isLoading, loadUser, skipInitialLoad, user])

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
