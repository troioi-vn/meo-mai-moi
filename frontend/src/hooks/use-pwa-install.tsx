import { useMemo } from 'react'
import { getBrowserEnvironment } from '@/lib/browser-environment'

export type PwaInstallMode = 'ios-safari' | 'ios-in-app' | 'none'

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
    if (!browserEnvironment.isIOS) return 'none'
    if (
      browserEnvironment.isLikelyInAppBrowser ||
      browserEnvironment.isTelegramMiniApp ||
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
