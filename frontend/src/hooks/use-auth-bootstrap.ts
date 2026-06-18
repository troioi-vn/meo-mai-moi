import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import axios from 'axios'
import { api, csrf, setUnauthorizedHandler, SKIP_UNAUTHORIZED_REDIRECT_HEADER } from '@/api/axios'
import type { AuthStatus } from '@/contexts/auth-context'
import type { User } from '@/types/user'
import {
  clearCachedAuthIdentity,
  hasCachedAuthIdentity,
  syncCachedAuthIdentity,
} from '@/lib/auth-identity-cache'
import {
  clearAuthRecovery,
  createAuthRecoveryState,
  shouldKeepLoadingForStartupError,
  startOrContinueAuthRecovery,
  type AuthRecoveryState,
} from '@/lib/auth-recovery'
import { clearOfflineCache } from '@/lib/query-cache'

interface UseAuthBootstrapOptions {
  skipInitialLoad: boolean
  setUser: Dispatch<SetStateAction<User | null>>
  setStatus: Dispatch<SetStateAction<AuthStatus>>
  setAuthRecoveryAttempt: Dispatch<SetStateAction<number>>
}

export interface AuthBootstrapResult {
  loadUser: () => Promise<void>
  clearAuthenticatedAppState: () => Promise<void>
  syncCachedIdentity: (nextUserId: number | string | null) => Promise<void>
  recoveryStateRef: { current: AuthRecoveryState }
}

export function useAuthBootstrap({
  skipInitialLoad,
  setUser,
  setStatus,
  setAuthRecoveryAttempt,
}: UseAuthBootstrapOptions): AuthBootstrapResult {
  const recoveryStateRef = useRef(createAuthRecoveryState())
  const isRecoveringFromUnauthorizedRef = useRef(false)

  const syncCachedIdentity = useCallback(async (nextUserId: number | string | null) => {
    await syncCachedAuthIdentity(nextUserId, clearOfflineCache)
  }, [])

  const clearAuthenticatedAppState = useCallback(async () => {
    await clearOfflineCache()
    clearCachedAuthIdentity()
    setUser(null)
    setStatus('anonymous')
  }, [setStatus, setUser])

  const keepLoadingForAuthRecovery = useCallback(() => {
    if (!hasCachedAuthIdentity()) {
      return false
    }

    const shouldKeepLoading = startOrContinueAuthRecovery(recoveryStateRef.current)
    if (!shouldKeepLoading) {
      return false
    }

    setStatus('recovering')
    setAuthRecoveryAttempt((attempt) => attempt + 1)
    return true
  }, [setAuthRecoveryAttempt, setStatus])

  const clearAuthRecoveryState = useCallback(() => {
    clearAuthRecovery(recoveryStateRef.current)
  }, [])

  const loadUser = useCallback(async () => {
    let shouldKeepLoadingForRecovery = false
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
      clearAuthRecoveryState()
      setUser(loadedUser as unknown as User)
      setStatus('authenticated')
    } catch (error) {
      let handledAuthFailure = false

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          // Re-prime CSRF cookie once in case browser/state drifted after OAuth redirect.
          await csrf()
          const retriedUser = await api.get<User>('/users/me', requestConfig)
          await syncCachedIdentity(retriedUser.id)
          clearAuthRecoveryState()
          setUser(retriedUser as unknown as User)
          setStatus('authenticated')
          return
        } catch (retryError) {
          if (!axios.isAxiosError(retryError) || retryError.response?.status !== 401) {
            console.error('Error loading user after CSRF retry:', retryError)
          } else {
            shouldKeepLoadingForRecovery = keepLoadingForAuthRecovery()
            if (shouldKeepLoadingForRecovery) {
              handledAuthFailure = true
            } else {
              await clearAuthenticatedAppState()
              handledAuthFailure = true
            }
          }
        }
      }

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (!handledAuthFailure) {
          shouldKeepLoadingForRecovery = keepLoadingForAuthRecovery()
          if (shouldKeepLoadingForRecovery) {
            handledAuthFailure = true
          } else {
            await clearAuthenticatedAppState()
            handledAuthFailure = true
          }
        }
      } else if (shouldKeepLoadingForStartupError(error, recoveryStateRef.current)) {
        shouldKeepLoadingForRecovery = keepLoadingForAuthRecovery()
        handledAuthFailure = true
      } else {
        clearAuthRecoveryState()
        console.error('Error loading user:', error)
        setUser(null)
        setStatus('anonymous')
      }
    } finally {
      if (!shouldKeepLoadingForRecovery) {
        setStatus((current) => (current === 'unknown' ? 'anonymous' : current))
      }
    }
  }, [
    clearAuthenticatedAppState,
    clearAuthRecoveryState,
    keepLoadingForAuthRecovery,
    setStatus,
    setUser,
    syncCachedIdentity,
  ])

  useEffect(() => {
    if (!skipInitialLoad) {
      void loadUser()
    }
  }, [loadUser, skipInitialLoad])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

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
          await syncCachedIdentity(recoveredUser.id)
          clearAuthRecoveryState()
          setUser(recoveredUser as unknown as User)
          setStatus('authenticated')
          return
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            console.error('Error revalidating auth after 401:', error)
          }
        } finally {
          isRecoveringFromUnauthorizedRef.current = false
        }

        const shouldRecover = keepLoadingForAuthRecovery()
        if (shouldRecover) {
          return
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
  }, [
    clearAuthenticatedAppState,
    clearAuthRecoveryState,
    keepLoadingForAuthRecovery,
    setStatus,
    setUser,
    syncCachedIdentity,
  ])

  return {
    loadUser,
    clearAuthenticatedAppState,
    syncCachedIdentity,
    recoveryStateRef,
  }
}
