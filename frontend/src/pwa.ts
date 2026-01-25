import { registerSW } from 'virtual:pwa-register'

// Enhanced service worker registration for PWA
// Provides update detection, periodic checks, and iOS focus-based updates
let swRegistration: ServiceWorkerRegistration | undefined
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let needsRefreshCallback: (() => void) | null = null
let pwaUpdatePending = false

const FORCE_RELOAD_ON_UPDATE = import.meta.env.VITE_FORCE_RELOAD_ON_UPDATE === 'true'

export function setNeedsRefreshCallback(callback: (() => void) | null) {
  needsRefreshCallback = callback
}

export function triggerAppUpdate() {
  if (updateSW) {
    void updateSW(true)
  }
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

  updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      console.log('[PWA] New version available')

      // Mark update as pending so we can reload on the next focus event.
      // This keeps long-lived tabs from staying on an old bundle indefinitely.
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
      if (pwaUpdatePending) {
        console.log('[PWA] Focus event - applying pending update')
        triggerAppUpdate()
        return
      }
      console.log('[PWA] Focus event - checking for updates')
      swRegistration.update().catch(() => {
        // Ignore errors on focus check
      })
    }
  })
}
