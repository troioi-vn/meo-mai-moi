import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { setNeedsRefreshCallback, triggerAppUpdate } from '@/main'

/**
 * Hook that handles PWA update notifications.
 * Shows a toast when a new version is available and allows the user to update.
 *
 * Usage: Call this hook once in your App component.
 */
export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const handleUpdate = useCallback(() => {
    triggerAppUpdate()
  }, [])

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  useEffect(() => {
    // Register callback to be notified when SW detects a new version
    setNeedsRefreshCallback(() => {
      setUpdateAvailable(true)
    })

    return () => {
      setNeedsRefreshCallback(null)
    }
  }, [])

  useEffect(() => {
    if (updateAvailable) {
      toast('New version available! 🎉', {
        description: 'Click Update to get the latest features.',
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: handleUpdate,
        },
        cancel: {
          label: 'Later',
          onClick: dismissUpdate,
        },
      })
    }
  }, [updateAvailable, handleUpdate, dismissUpdate])

  return { updateAvailable, handleUpdate, dismissUpdate }
}
