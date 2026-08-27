import { useEffect } from 'react'
import { setNeedsRefreshCallback } from '@/pwa'
import { useAppUpdate } from '@/hooks/use-app-update'

/**
 * Hook that handles PWA update notifications.
 * Sends service worker updates to the shared, non-blocking update prompt.
 *
 * Usage: Call this hook once in your App component.
 */
export function usePwaUpdate() {
  const { requestAppUpdate } = useAppUpdate()

  useEffect(() => {
    // Register callback to be notified when SW detects a new version
    setNeedsRefreshCallback(() => {
      requestAppUpdate()
    })

    return () => {
      setNeedsRefreshCallback(null)
    }
  }, [requestAppUpdate])
}
