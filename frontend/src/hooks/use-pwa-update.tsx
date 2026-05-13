import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { setNeedsRefreshCallback, triggerAppUpdate } from '@/pwa'
import { hasBlockingDialogOpen, waitForBlockingDialogsToClose } from '@/lib/blocking-dialog'

/**
 * Hook that handles PWA update notifications.
 * Shows a toast when a new version is available and allows the user to update.
 *
 * Usage: Call this hook once in your App component.
 */
export function usePwaUpdate() {
  const { t } = useTranslation('common')
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false)

  const handleUpdate = useCallback(() => {
    setIsApplyingUpdate(true)
    setUpdateAvailable(false)
    setToastVisible(false)
    triggerAppUpdate()
  }, [])

  const dismissUpdate = useCallback(() => {
    setToastVisible(false)
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
    if (!updateAvailable || toastVisible || isApplyingUpdate) {
      return
    }

    const showToast = () => {
      setToastVisible(true)

      toast(t('pwa.updateTitle'), {
        description: t('pwa.updateDescription'),
        duration: Infinity,
        action: {
          label: t('pwa.update'),
          onClick: handleUpdate,
        },
        cancel: {
          label: t('pwa.updateLater'),
          onClick: dismissUpdate,
        },
      })
    }

    if (hasBlockingDialogOpen()) {
      return waitForBlockingDialogsToClose(showToast)
    }

    showToast()
  }, [updateAvailable, toastVisible, isApplyingUpdate, handleUpdate, dismissUpdate, t])

  return { updateAvailable, handleUpdate, dismissUpdate }
}
