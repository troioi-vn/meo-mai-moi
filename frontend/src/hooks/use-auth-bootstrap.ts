import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { onlineManager } from '@tanstack/react-query'
import { api, csrf, setUnauthorizedHandler, SKIP_UNAUTHORIZED_REDIRECT_HEADER } from '@/api/axios'
import { isTransientAuthBootstrapError, isUnauthorizedError } from '@/api/auth-errors'
import type { AuthStatus } from '@/contexts/auth-context'
import type { User } from '@/types/user'
import {
  buildOfflinePlaceholderUser,
  clearAuthRecoveryHints,
  clearCachedAuthIdentity,
  getRecoverableCachedUser,
  hasRecoverableAuthSession,
  readCachedAuthUser,
  resolveAuthRecoveryHints,
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
import { isStandalonePwa } from '@/pwa'

const PWA_AUTH_COOKIE_WARMUP_MS = 150

interface UseAuthBootstrapOptions {
  skipInitialLoad: boolean
  setUser: Dispatch<SetStateAction<User | null>>
  setStatus: Dispatch<SetStateAction<AuthStatus>>
  setAuthRecoveryAttempt: Dispatch<SetStateAction<number>>
  setIsSessionFromCache: Dispatch<SetStateAction<boolean>>
}

export interface AuthBootstrapResult {
  loadUser: () => Promise<void>
  clearAuthenticatedAppState: () => Promise<void>
  syncCachedIdentity: (nextUser: User | null) => Promise<void>
  recoveryStateRef: { current: AuthRecoveryState }
}

type SessionSource = 'server' | 'cache'

export function useAuthBootstrap({
  skipInitialLoad,
  setUser,
  setStatus,
  setAuthRecoveryAttempt,
  setIsSessionFromCache,
}: UseAuthBootstrapOptions): AuthBootstrapResult {
  const recoveryStateRef = useRef(createAuthRecoveryState())
  const isRecoveringFromUnauthorizedRef = useRef(false)
  const sessionSourceRef = useRef<SessionSource | null>(null)
  const loadUserInFlightRef = useRef<Promise<void> | null>(null)

  const markSessionSource = useCallback(
    (source: SessionSource | null) => {
      sessionSourceRef.current = source
      setIsSessionFromCache(source === 'cache')
    },
    [setIsSessionFromCache]
  )

  const syncCachedIdentity = useCallback(async (nextUser: User | null) => {
    await syncCachedAuthIdentity(nextUser, clearOfflineCache)
  }, [])

  const clearAuthRecoveryState = useCallback(() => {
    clearAuthRecovery(recoveryStateRef.current)
  }, [])

  const clearAuthenticatedAppState = useCallback(async () => {
    clearAuthRecoveryState()
    await clearOfflineCache()
    clearCachedAuthIdentity()
    clearAuthRecoveryHints()
    markSessionSource(null)
    setUser(null)
    setStatus('anonymous')
  }, [clearAuthRecoveryState, markSessionSource, setStatus, setUser])

  const keepLoadingForAuthRecovery = useCallback(() => {
    if (!hasRecoverableAuthSession()) {
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

  const startBackgroundRevalidation = useCallback(() => {
    if (!hasRecoverableAuthSession()) {
      return false
    }

    const shouldRevalidate = startOrContinueAuthRecovery(recoveryStateRef.current)
    if (!shouldRevalidate) {
      return false
    }

    setAuthRecoveryAttempt((attempt) => attempt + 1)
    return true
  }, [setAuthRecoveryAttempt])

  const hydrateFromCachedUser = useCallback(
    (source: SessionSource = 'cache') => {
      const cachedUser = getRecoverableCachedUser()
      if (!cachedUser) {
        return false
      }

      markSessionSource(source)
      setUser(cachedUser)
      setStatus('authenticated')
      return true
    },
    [markSessionSource, setStatus, setUser]
  )

  const loadUserInternal = useCallback(async () => {
    const requestConfig = {
      headers: {
        [SKIP_UNAUTHORIZED_REDIRECT_HEADER]: '1',
      },
    }

    const handleTransient = () => {
      if (sessionSourceRef.current !== null) {
        startBackgroundRevalidation()
        return true
      }

      // While online, only hydrate optimistically from a full cached user. An
      // id-only fallback has no real profile (empty name/email, no ban or
      // verification state), so prefer the brief `recovering` window where the
      // background retry can fetch the authoritative user instead of flashing a
      // broken authenticated shell.
      if (readCachedAuthUser() !== null && hydrateFromCachedUser('cache')) {
        startBackgroundRevalidation()
        return true
      }

      return keepLoadingForAuthRecovery()
    }

    if (!onlineManager.isOnline()) {
      if (sessionSourceRef.current !== null) {
        startBackgroundRevalidation()
        return
      }

      if (hydrateFromCachedUser('cache')) {
        startBackgroundRevalidation()
        return
      }

      if (hasRecoverableAuthSession()) {
        markSessionSource('cache')
        setUser(getRecoverableCachedUser() ?? buildOfflinePlaceholderUser())
        setStatus('authenticated')
        return
      }

      setStatus((current) => (current === 'unknown' ? 'anonymous' : current))
      return
    }

    try {
      await csrf()

      if (isStandalonePwa() && hasRecoverableAuthSession()) {
        await new Promise((resolve) => window.setTimeout(resolve, PWA_AUTH_COOKIE_WARMUP_MS))
      }

      const loadedUser = await api.get<User>('/users/me', {
        ...requestConfig,
        params: {
          _auth_identity: Date.now(),
        },
      })
      await syncCachedIdentity(loadedUser)
      markSessionSource('server')
      clearAuthRecoveryState()
      setUser(loadedUser as unknown as User)
      setStatus('authenticated')
    } catch (error) {
      let handledAuthFailure = false

      if (isUnauthorizedError(error)) {
        try {
          // Re-prime CSRF cookie once in case browser/state drifted after OAuth redirect.
          await csrf()
          const retriedUser = await api.get<User>('/users/me', requestConfig)
          await syncCachedIdentity(retriedUser)
          markSessionSource('server')
          clearAuthRecoveryState()
          setUser(retriedUser as unknown as User)
          setStatus('authenticated')
          return
        } catch (retryError) {
          if (!isUnauthorizedError(retryError)) {
            console.error('Error loading user after CSRF retry:', retryError)
            if (isTransientAuthBootstrapError(retryError)) {
              handledAuthFailure = handleTransient()
            }
          } else {
            await clearAuthenticatedAppState()
            handledAuthFailure = true
          }
        }
      }

      if (isUnauthorizedError(error)) {
        if (!handledAuthFailure) {
          await clearAuthenticatedAppState()
          handledAuthFailure = true
        }
      } else if (shouldKeepLoadingForStartupError(error, recoveryStateRef.current)) {
        handledAuthFailure = handleTransient()
        if (!handledAuthFailure) {
          setStatus((current) => (current === 'unknown' ? 'anonymous' : current))
        }
      } else {
        clearAuthRecoveryState()
        console.error('Error loading user:', error)
        setUser(null)
        markSessionSource(null)
        setStatus('anonymous')
      }
    }
  }, [
    clearAuthenticatedAppState,
    clearAuthRecoveryState,
    hydrateFromCachedUser,
    keepLoadingForAuthRecovery,
    markSessionSource,
    setStatus,
    setUser,
    startBackgroundRevalidation,
    syncCachedIdentity,
  ])

  const loadUser = useCallback(async () => {
    if (loadUserInFlightRef.current) {
      return loadUserInFlightRef.current
    }

    const promise = loadUserInternal()
    loadUserInFlightRef.current = promise

    try {
      await promise
    } finally {
      if (loadUserInFlightRef.current === promise) {
        loadUserInFlightRef.current = null
      }
    }
  }, [loadUserInternal])

  useEffect(() => {
    if (skipInitialLoad) {
      return
    }

    void (async () => {
      await resolveAuthRecoveryHints()
      await loadUser()
    })()
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
          await syncCachedIdentity(recoveredUser)
          markSessionSource('server')
          clearAuthRecoveryState()
          setUser(recoveredUser as unknown as User)
          setStatus('authenticated')
          return
        } catch (error) {
          if (!isUnauthorizedError(error) && isTransientAuthBootstrapError(error)) {
            console.error('Transient error revalidating auth after 401:', error)
            startBackgroundRevalidation()
            return
          }

          if (!isUnauthorizedError(error)) {
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
  }, [
    clearAuthenticatedAppState,
    clearAuthRecoveryState,
    markSessionSource,
    setStatus,
    setUser,
    startBackgroundRevalidation,
    syncCachedIdentity,
  ])

  return {
    loadUser,
    clearAuthenticatedAppState,
    syncCachedIdentity,
    recoveryStateRef,
  }
}
