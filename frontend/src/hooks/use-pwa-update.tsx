import { useEffect } from 'react'
import { setNeedsRefreshCallback } from '@/pwa'
import { useSilentAppUpdate } from '@/hooks/use-app-update'

/**
 * Hook that handles PWA update notifications.
 * Defers reload until forms and blocking dialogs are safe, unless force reload is enabled.
 *
 * Usage: Call this hook once in your App component.
 */
export function usePwaUpdate() {
  const { requestSilentAppUpdate } = useSilentAppUpdate()

  useEffect(() => {
    // Register callback to be notified when SW detects a new version
    setNeedsRefreshCallback(() => {
      requestSilentAppUpdate()
    })

    return () => {
      setNeedsRefreshCallback(null)
    }
  }, [requestSilentAppUpdate])
}
