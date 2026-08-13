import { useMemo } from 'react'
import { getBrowserEnvironment } from '@/lib/browser-environment'

export type PwaInstallMode = 'ios-safari' | 'ios-in-app' | 'android-in-app' | 'none'

/**
 * Checks if the app is already installed as a PWA.
 */
export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Check display-mode media query (works on most browsers)
  if (window.matchMedia('(display-mode: standalone)').matches) return true

  // iOS Safari specific check
  // oxlint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  if ((navigator as any).standalone === true) return true

  return false
}

/**
 * Hook that exposes manual install instructions for iOS.
 *
 * Chromium browsers own the native install UI; this hook intentionally does
 * not capture or defer `beforeinstallprompt`.
 *
 * Usage:
 * ```tsx
 * const { canInstall, installMode } = usePwaInstall()
 * ```
 */
export function usePwaInstall(_isAuthenticated = false) {
  const browserEnvironment = useMemo(() => getBrowserEnvironment(), [])

  const installMode = useMemo<PwaInstallMode>(() => {
    if (isAppInstalled()) return 'none'

    // The Mini App is a webview the user picked on purpose, and "Stay in Telegram" is a
    // supported way to live here. Pushing an install there is noise, not help.
    if (browserEnvironment.isTelegramMiniApp) return 'none'

    if (!browserEnvironment.isIOS) {
      return browserEnvironment.isInAppBrowser ? 'android-in-app' : 'none'
    }
    if (
      browserEnvironment.isLikelyInAppBrowser ||
      browserEnvironment.isInAppBrowser ||
      !browserEnvironment.isSafari
    ) {
      return 'ios-in-app'
    }
    return 'ios-safari'
  }, [browserEnvironment])

  return {
    showBanner: false,
    canInstall: installMode !== 'none',
    installMode,
  }
}
