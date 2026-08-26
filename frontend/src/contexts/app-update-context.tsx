import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { hasBlockingDialogOpen, waitForBlockingDialogsToClose } from '@/lib/blocking-dialog'
import { triggerAppUpdate } from '@/pwa'
import { AppUpdateContext, type AppUpdateContextValue } from '@/contexts/app-update-context-store'

export function AppUpdateProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const [dirtyForms, setDirtyForms] = useState<Record<string, boolean>>({})
  const [isUpdatePending, setIsUpdatePending] = useState(false)
  const cancelDialogWaitRef = useRef<(() => void) | null>(null)
  const updateToastIdRef = useRef<string | number | null>(null)
  const updateTriggeredRef = useRef(false)

  const hasDirtyForms = Object.values(dirtyForms).some(Boolean)

  const dismissUpdate = useCallback(() => {
    setIsUpdatePending(false)
    updateToastIdRef.current = null
  }, [])

  const applyUpdate = useCallback(() => {
    if (updateTriggeredRef.current) {
      return
    }

    updateTriggeredRef.current = true
    setIsUpdatePending(false)

    if (updateToastIdRef.current !== null) {
      toast.dismiss(updateToastIdRef.current)
      updateToastIdRef.current = null
    }

    triggerAppUpdate()
  }, [])

  const showPendingUpdate = useCallback(() => {
    cancelDialogWaitRef.current?.()
    cancelDialogWaitRef.current = null

    if (!isUpdatePending || updateTriggeredRef.current || updateToastIdRef.current !== null) {
      return
    }

    if (hasDirtyForms) {
      return
    }

    if (hasBlockingDialogOpen()) {
      cancelDialogWaitRef.current = waitForBlockingDialogsToClose(() => {
        showPendingUpdate()
      })
      return
    }

    updateToastIdRef.current = toast(t('pwa.updateTitle'), {
      description: t('pwa.updateDescription'),
      duration: Infinity,
      action: {
        label: t('pwa.update'),
        onClick: applyUpdate,
      },
      cancel: {
        label: t('pwa.updateLater'),
        onClick: dismissUpdate,
      },
      onDismiss: dismissUpdate,
    })
  }, [applyUpdate, dismissUpdate, hasDirtyForms, isUpdatePending, t])

  useEffect(() => {
    showPendingUpdate()

    return () => {
      cancelDialogWaitRef.current?.()
      cancelDialogWaitRef.current = null
    }
  }, [showPendingUpdate])

  const requestAppUpdate = useCallback(() => {
    if (!updateTriggeredRef.current) {
      setIsUpdatePending(true)
    }
  }, [])

  const setDirtyFormState = useCallback((formId: string, isDirty: boolean) => {
    setDirtyForms((current) => {
      if (current[formId] === isDirty) {
        return current
      }

      return {
        ...current,
        [formId]: isDirty,
      }
    })
  }, [])

  const clearDirtyFormState = useCallback((formId: string) => {
    setDirtyForms((current) => {
      if (!(formId in current)) {
        return current
      }

      const { [formId]: _removed, ...next } = current
      return next
    })
  }, [])

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      hasDirtyForms,
      isUpdatePending,
      requestAppUpdate,
      setDirtyFormState,
      clearDirtyFormState,
    }),
    [clearDirtyFormState, hasDirtyForms, isUpdatePending, requestAppUpdate, setDirtyFormState]
  )

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
}
