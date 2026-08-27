import { registerSW } from 'virtual:pwa-register'

// Enhanced service worker registration for PWA
// Provides update detection, periodic checks, and iOS focus-based updates
let swRegistration: ServiceWorkerRegistration | undefined
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let needsRefreshCallback: (() => void) | null = null
let pwaUpdatePending = false
let updateInProgress = false
let staleAppRecoveryInProgress = false
let updateReloadFallbackTimer: number | undefined

const FORCE_RELOAD_ON_UPDATE = import.meta.env.VITE_FORCE_RELOAD_ON_UPDATE === 'true'
const UPDATE_RELOAD_FALLBACK_MS = 4000
const LEGACY_BUILD_SCOPE_PATHNAME = '/build/'
// Workbox names its precache `workbox-precache-v2-<origin>`; `cleanupOutdatedCaches`
// leaves earlier revisions behind under the same prefix.
const PRECACHE_CACHE_NAME_PREFIX = 'workbox-precache'

export function setNeedsRefreshCallback(callback: (() => void) | null) {
  needsRefreshCallback = callback
}

function clearUpdateReloadFallback() {
  if (updateReloadFallbackTimer === undefined || typeof window === 'undefined') return

  window.clearTimeout(updateReloadFallbackTimer)
  updateReloadFallbackTimer = undefined
}

function reloadPageForUpdate() {
  if (typeof window === 'undefined') return

  window.location.reload()
}

function scheduleUpdateReloadFallback() {
  if (typeof window === 'undefined') return

  clearUpdateReloadFallback()
  updateReloadFallbackTimer = window.setTimeout(() => {
    console.warn('[PWA] Service worker update did not reload in time; recovering from stale app')
    updateInProgress = false
    void recoverFromStaleApp()
  }, UPDATE_RELOAD_FALLBACK_MS)
}

function reloadWhenServiceWorkerTakesControl() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      clearUpdateReloadFallback()
      updateInProgress = false
      reloadPageForUpdate()
    },
    { once: true }
  )
}

export function triggerAppUpdate() {
  pwaUpdatePending = false

  if (updateInProgress) {
    return
  }

  updateInProgress = true
  scheduleUpdateReloadFallback()
  reloadWhenServiceWorkerTakesControl()

  if (!updateSW) {
    console.warn('[PWA] Update requested before service worker updater was ready; recovering')
    updateInProgress = false
    void recoverFromStaleApp()
    return
  }

  void updateSW(true).catch((error: unknown) => {
    console.warn('[PWA] Service worker update failed; recovering from stale app', error)
    updateInProgress = false
    void recoverFromStaleApp()
  })
}

/**
 * Deletes the precached app shell so no worker can serve it again.
 *
 * Unregistering alone does not achieve this. A worker keeps controlling the
 * clients it already has until they are gone, which includes the page that is
 * about to reload, and while it controls that page `navigateFallback` answers
 * every navigation from the precache. The obsolete shell then comes back with
 * the same chunk URLs the deploy already deleted, and the update prompt
 * reappears - the reload looks like it did nothing. Emptying the precache
 * makes Workbox's precache strategy fall through to the network instead, so
 * recovery no longer depends on how quickly the browser releases the worker.
 *
 * Only the Workbox precache goes. `media-cache` and `image-cache` hold user
 * photos that are still valid and expensive to fetch again, and hashed entries
 * in `build-asset-cache` can never be stale because a new build renames them.
 *
 * Skipped when the browser reports it is offline: the precache is the only copy
 * of the app there, and there would be nothing to replace it with.
 */
async function dropPrecachedAppShell() {
  if (typeof caches === 'undefined') {
    return
  }

  try {
    if (!navigator.onLine) {
      console.warn('[PWA] Offline; keeping the precached app shell as the only copy of the app')
      return
    }
  } catch {
    // A partial navigator must not stop the recovery below.
  }

  try {
    const cacheNames = await caches.keys()

    await Promise.allSettled(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(PRECACHE_CACHE_NAME_PREFIX))
        .map((cacheName) => caches.delete(cacheName))
    )
  } catch (error: unknown) {
    console.warn('[PWA] Could not drop the precached app shell', error)
  }
}

/**
 * Escapes a worker that keeps serving an obsolete app shell after a deploy.
 * This is reserved for failed update activation and chunk-load errors, where
 * the current page cannot recover without a network navigation.
 */
export async function recoverFromStaleApp() {
  if (staleAppRecoveryInProgress || typeof window === 'undefined') {
    return
  }

  staleAppRecoveryInProgress = true
  clearUpdateReloadFallback()

  await dropPrecachedAppShell()

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.allSettled(registrations.map((registration) => registration.unregister()))
    } catch (error: unknown) {
      console.warn('[PWA] Could not unregister the stale service worker', error)
    }
  }

  reloadPageForUpdate()
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  ) {
    return true
  }

  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function shouldUnregisterLegacyBuildWorker(registration: ServiceWorkerRegistration) {
  try {
    return new URL(registration.scope).pathname === LEGACY_BUILD_SCOPE_PATHNAME
  } catch {
    return false
  }
}

async function cleanupLegacyBuildScopedServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  const legacyRegistrations = registrations.filter(shouldUnregisterLegacyBuildWorker)

  if (legacyRegistrations.length === 0) {
    return
  }

  console.log('[PWA] Removing legacy build-scoped service worker registrations')
  await Promise.allSettled(legacyRegistrations.map((registration) => registration.unregister()))
}

function registerAppServiceWorker() {
  updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      console.log('[PWA] New version available')

      if (pwaUpdatePending) {
        console.log('[PWA] Update already pending; skipping duplicate refresh prompt')
        return
      }

      pwaUpdatePending = true

      // If explicitly enabled, reload immediately when a new SW is ready.
      // This is the strongest guarantee that users will move to the latest deploy.
      if (FORCE_RELOAD_ON_UPDATE) {
        console.log('[PWA] Forcing reload to apply update')
        triggerAppUpdate()
        return
      }

      if (needsRefreshCallback) {
        needsRefreshCallback()
      }
    },

    onOfflineReady() {
      console.log('[PWA] App ready to work offline')
    },

    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] Service worker registered:', swUrl)
      swRegistration = registration

      if (registration) {
        // Periodic update checks every hour for long-lived sessions
        setInterval(
          () => {
            console.log('[PWA] Checking for updates...')
            registration.update().catch((err: unknown) => {
              console.warn('[PWA] Update check failed:', err)
            })
          },
          60 * 60 * 1000
        )
      }
    },

    onRegisterError(error) {
      console.error('[PWA] Registration failed:', error)
    },
  })

  // iOS/Safari: Check for updates when app regains focus
  // iOS doesn't check as frequently in background
  window.addEventListener('focus', () => {
    if (swRegistration) {
      console.log('[PWA] Focus event - checking for updates')
      swRegistration.update().catch(() => {
        // Ignore errors on focus check
      })
    }
  })
}

/**
 * Registers the PWA service worker.
 *
 * Important: this must be called from the real browser entrypoint (`main.tsx`).
 * It is intentionally NOT run at module import time so tests can safely import
 * helpers like `setNeedsRefreshCallback` without bootstrapping the whole app.
 */
export function initPwaServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  void cleanupLegacyBuildScopedServiceWorkers()
    .catch((error: unknown) => {
      console.warn('[PWA] Legacy service worker cleanup failed:', error)
    })
    .finally(registerAppServiceWorker)
}
