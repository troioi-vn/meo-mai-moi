import { useEffect, type RefObject } from 'react'
import type { User } from '@/types/user'
import {
  isAuthRecoveryActive,
  scheduleAuthRecoveryRetry,
  type AuthRecoveryState,
} from '@/lib/auth-recovery'

const MIN_REFRESH_INTERVAL_MS = 5000

interface UseAuthRefreshListenersOptions {
  skipInitialLoad: boolean
  user: User | null
  authRecoveryAttempt: number
  loadUser: () => Promise<void>
  recoveryStateRef: RefObject<AuthRecoveryState>
}

export function useAuthRefreshListeners({
  skipInitialLoad,
  user,
  authRecoveryAttempt,
  loadUser,
  recoveryStateRef,
}: UseAuthRefreshListenersOptions): void {
  useEffect(() => {
    if (skipInitialLoad) {
      return
    }

    let lastRefreshTime = 0
    const recoveryState = recoveryStateRef.current

    const shouldAttemptAuthRecovery = () => isAuthRecoveryActive(recoveryState)

    const refreshUserIfNeeded = () => {
      if (!user && !shouldAttemptAuthRecovery()) {
        return
      }

      const now = Date.now()
      if (now - lastRefreshTime < MIN_REFRESH_INTERVAL_MS) {
        return
      }
      lastRefreshTime = now
      void loadUser()
    }

    const scheduleStartupRecovery = () => {
      scheduleAuthRecoveryRetry(recoveryState, refreshUserIfNeeded)
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

    const handleAuthRefresh = () => {
      refreshUserIfNeeded()
    }

    // Listen for visibility changes (less aggressive than focus events)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('online', handleOnline)
    window.addEventListener('meo-auth-refresh', handleAuthRefresh)

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
      window.removeEventListener('meo-auth-refresh', handleAuthRefresh)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate)
      }
      if (recoveryState.scheduledRecoveryTimeoutId !== null && typeof window !== 'undefined') {
        window.clearTimeout(recoveryState.scheduledRecoveryTimeoutId)
        recoveryState.scheduledRecoveryTimeoutId = null
      }
    }
  }, [authRecoveryAttempt, loadUser, recoveryStateRef, skipInitialLoad, user])
}
