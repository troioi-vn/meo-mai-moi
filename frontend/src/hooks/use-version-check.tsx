import { useEffect } from 'react'
import { setVersionMismatchHandler } from '@/api/axios'
import { useSilentAppUpdate } from '@/hooks/use-app-update'

/**
 * Listens for API version mismatches (via X-App-Version header)
 * and shows a persistent toast prompting the user to reload.
 *
 * If the user clicks "Later", the toast is suppressed for 30 minutes
 * and then reappears on the next API call that still carries a new version.
 *
 * Usage: call once in App component, alongside usePwaUpdate.
 */
export function useVersionCheck() {
  const { requestSilentAppUpdate } = useSilentAppUpdate()

  useEffect(() => {
    setVersionMismatchHandler(() => {
      requestSilentAppUpdate()
    })

    return () => {
      setVersionMismatchHandler(null)
    }
  }, [requestSilentAppUpdate])
}
