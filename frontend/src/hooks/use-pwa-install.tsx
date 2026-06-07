import { useEffect, useState, useCallback, useMemo } from 'react'
import { getBrowserEnvironment } from '@/lib/browser-environment'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type PwaInstallMode = 'native' | 'ios-safari' | 'ios-in-app' | 'none'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaWindow extends Window {
  __deferredInstallPrompt?: BeforeInstallPromptEvent | null
}

/**
 * Detects if the user is on a mobile device.
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  // Check for touch capability and screen size
  const hasTouchScreen =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0

  // Check user agent for mobile patterns
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  // Consider it mobile if it has touch and matches mobile user agent
  // or if screen is narrow (likely a phone in portrait)
  return (hasTouchScreen && mobileUserAgent) || window.innerWidth < 768
}

/**
 * Checks if the app is already installed as a PWA.
 */
function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Check display-mode media query (works on most browsers)
  if (window.matchMedia('(display-mode: standalone)').matches) return true

  // iOS Safari specific check
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  if ((navigator as any).standalone === true) return true

  return false
}

/**
 * Checks if the dismiss period has expired.
 */
function isDismissExpired(): boolean {
  if (typeof window === 'undefined') return true

  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) return true

    const dismissedTime = parseInt(dismissedAt, 10)
    if (isNaN(dismissedTime)) return true

    return Date.now() - dismissedTime > DISMISS_DURATION_MS
  } catch {
    return true
  }
}

function isInstallDismissed(): boolean {
  return !isDismissExpired()
}

/**
 * Hook that manages PWA install prompt.
 *
 * - Captures the `beforeinstallprompt` event
 * - Only shows on mobile devices
 * - Respects 30-day dismiss period
 * - Triggers after user is authenticated
 *
 * Usage:
 * ```tsx
 * const { showBanner, triggerInstall, dismissBanner } = usePwaInstall()
 * ```
 */
export function usePwaInstall(isAuthenticated: boolean) {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    () => {
      if (typeof window === 'undefined') return null
      return (window as PwaWindow).__deferredInstallPrompt ?? null
    }
  )
  const [isDismissed, setIsDismissed] = useState(() => isInstallDismissed())
  const [hasInstalled, setHasInstalled] = useState(() => isAppInstalled())
  const browserEnvironment = useMemo(() => getBrowserEnvironment(), [])
  const isDismissSuppressed = isDismissed || isInstallDismissed()

  // Capture the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return

    const win = window as PwaWindow

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser mini-infobar
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      win.__deferredInstallPrompt = promptEvent
      setInstallPromptEvent(promptEvent)
    }

    const handleAppInstalled = () => {
      win.__deferredInstallPrompt = null
      setHasInstalled(true)
      setInstallPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Derive showBanner from state values
  const showBanner = useMemo(() => {
    if (!isAuthenticated) return false
    if (isDismissSuppressed) return false
    if (hasInstalled) return false
    if (!isMobileDevice() && !browserEnvironment.isIOS) return false
    if (isAppInstalled()) return false
    return installPromptEvent !== null || browserEnvironment.isIOS
  }, [
    isAuthenticated,
    installPromptEvent,
    isDismissSuppressed,
    hasInstalled,
    browserEnvironment.isIOS,
  ])

  const installMode = useMemo<PwaInstallMode>(() => {
    if (isDismissSuppressed || hasInstalled || isAppInstalled()) return 'none'
    if (installPromptEvent) return 'native'
    if (!browserEnvironment.isIOS) return 'none'
    if (
      browserEnvironment.isLikelyInAppBrowser ||
      browserEnvironment.isTelegramMiniApp ||
      !browserEnvironment.isSafari
    ) {
      return 'ios-in-app'
    }
    return 'ios-safari'
  }, [browserEnvironment, hasInstalled, installPromptEvent, isDismissSuppressed])

  const triggerInstall = useCallback(async () => {
    if (!installPromptEvent) return

    try {
      await installPromptEvent.prompt()
      const { outcome } = await installPromptEvent.userChoice

      if (outcome === 'accepted') {
        setHasInstalled(true)
      }
      ;(window as PwaWindow).__deferredInstallPrompt = null
      setInstallPromptEvent(null)
    } catch (error) {
      console.error('Error showing install prompt:', error)
    }
  }, [installPromptEvent])

  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setIsDismissed(true)
  }, [])

  return {
    showBanner,
    canInstall: installMode !== 'none',
    installMode,
    triggerInstall,
    dismissBanner,
  }
}
