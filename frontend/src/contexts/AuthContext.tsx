import React, { useCallback, useEffect, useState } from 'react'
import { api, authApi, csrf, setUnauthorizedHandler } from '@/api/axios'
import type { User } from '@/types/user'
import type { RegisterPayload, RegisterResponse, LoginPayload, LoginResponse } from '@/types/auth'
import { AuthContext } from './auth-context'

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

  const loadUser = useCallback(async () => {
    try {
      // Add cache-busting to ensure fresh user data after cache clear/deployment
      const { data } = await api.get<{ data: User }>('users/me', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })
      setUser(data.data)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    await csrf()
    const { data } = await authApi.post<{ data: RegisterResponse }>('/register', payload)

    // Set user immediately (even if not yet verified) so header can show logout
    setUser(data.data.user)

    return data.data
  }, [])

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResponse> => {
      await csrf()
      const { data } = await authApi.post<{ data: LoginResponse }>('/login', payload)

      // Set user immediately from response
      setUser(data.data.user)

      // Fetch full profile (avatar, etc.) after auth cookie is set
      void loadUser()

      return data.data
    },
    [loadUser]
  )

  const logout = useCallback(async () => {
    await authApi.post('/logout')
    setUser(null)
  }, [])

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    const { data } = await api.post<{ data: { exists: boolean } }>('/check-email', { email })
    return data.data.exists
  }, [])

  const changePassword = useCallback(
    async (current_password: string, new_password: string, new_password_confirmation: string) => {
      await api.put('/users/me/password', {
        current_password,
        new_password,
        new_password_confirmation,
      })
    },
    []
  )

  const deleteAccount = useCallback(async (password: string) => {
    await api.delete('/users/me', { data: { password } })
    setUser(null)
  }, [])

  useEffect(() => {
    if (!skipInitialLoad) {
      // Don't load user on public pages to avoid 401 redirects
      const publicPaths = ['/register', '/login', '/forgot-password', '/password/reset', '/email/verify']
      const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path))
      
      if (!isPublicPath) {
        void loadUser()
      } else {
        // On public pages, just set loading to false without making API call
        setIsLoading(false)
      }
    }
  }, [loadUser, skipInitialLoad])

  // Globally handle 401 responses by clearing auth state and redirecting to login
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = () => {
      setUser(null)
      const { pathname, search, hash } = window.location

      // Avoid redirect loops and don't redirect from public pages
      const publicPaths = ['/login', '/register', '/forgot-password', '/password/reset', '/email/verify']
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
      
      if (isPublicPath) {
        return
      }

      const currentLocation = `${pathname}${search}${hash}`
      const redirectParam = encodeURIComponent(currentLocation || '/')
      window.location.assign(`/login?redirect=${redirectParam}`)
    }

    setUnauthorizedHandler(handler)
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [])

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
      checkEmail,
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
      checkEmail,
    ]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
