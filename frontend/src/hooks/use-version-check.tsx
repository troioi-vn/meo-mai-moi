import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { setVersionMismatchHandler } from '@/api/axios'

const SNOOZE_MS = 30 * 60 * 1000 // 30 minutes

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
  const { t } = useTranslation('common')
  const snoozedUntilRef = useRef(0)
  const toastVisibleRef = useRef(false)

  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  const handleSnooze = useCallback(() => {
    snoozedUntilRef.current = Date.now() + SNOOZE_MS
    toastVisibleRef.current = false
  }, [])

  useEffect(() => {
    setVersionMismatchHandler(() => {
      if (toastVisibleRef.current) return
      if (Date.now() < snoozedUntilRef.current) return

      toastVisibleRef.current = true

      toast(t('versionUpdate.title'), {
        description: t('versionUpdate.description'),
        duration: Infinity,
        action: {
          label: t('versionUpdate.reload'),
          onClick: handleReload,
        },
        cancel: {
          label: t('versionUpdate.later'),
          onClick: handleSnooze,
        },
      })
    })

    return () => {
      setVersionMismatchHandler(null)
    }
  }, [t, handleReload, handleSnooze])
}
