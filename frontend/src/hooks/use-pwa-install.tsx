import { useEffect, useState, useCallback, useMemo } from 'react'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  if ((navigator as any).standalone === true) return true

  return false
}

/**
 * Checks if the dismiss period has expired.
 */
function isDismissExpired(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true

  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) return true

    const dismissedTime = parseInt(dismissedAt, 10)
    if (isNaN(dismissedTime)) return true

    return Date.now() - dismissedTime > DISMISS_DURATION_MS
  } catch (e) {
    return true
  }
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
    null
  )
  const [isDismissed, setIsDismissed] = useState(() => !isDismissExpired())
  const [hasInstalled, setHasInstalled] = useState(false)

  // Capture the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser mini-infobar
      e.preventDefault()
      setInstallPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Derive showBanner from state values
  const showBanner = useMemo(() => {
    if (!isAuthenticated) return false
    if (!installPromptEvent) return false
    if (isDismissed) return false
    if (hasInstalled) return false
    if (!isMobileDevice()) return false
    if (isAppInstalled()) return false
    return true
  }, [isAuthenticated, installPromptEvent, isDismissed, hasInstalled])

  const triggerInstall = useCallback(async () => {
    if (!installPromptEvent) return

    try {
      await installPromptEvent.prompt()
      const { outcome } = await installPromptEvent.userChoice

      if (outcome === 'accepted') {
        setHasInstalled(true)
        setInstallPromptEvent(null)
      }
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
    canInstall: installPromptEvent !== null,
    triggerInstall,
    dismissBanner,
  }
}
