import { useEffect } from 'react'
import { setVersionMismatchHandler } from '@/api/axios'
import { useAppUpdate } from '@/hooks/use-app-update'

/**
 * Listens for API version mismatches (via X-App-Version header)
 * and asks the shared update provider to notify the user.
 *
 * Usage: call once in App component, alongside usePwaUpdate.
 */
export function useVersionCheck() {
  const { requestAppUpdate } = useAppUpdate()

  useEffect(() => {
    setVersionMismatchHandler(() => {
      requestAppUpdate()
    })

    return () => {
      setVersionMismatchHandler(null)
    }
  }, [requestAppUpdate])
}
