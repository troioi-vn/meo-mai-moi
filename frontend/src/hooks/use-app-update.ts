import { useContext, useEffect, useId, useRef } from 'react'
import { AppUpdateContext } from '@/contexts/app-update-context-store'

function useAppUpdateContext() {
  const context = useContext(AppUpdateContext)

  if (!context) {
    throw new Error('useAppUpdateContext must be used within <AppUpdateProvider>')
  }

  return context
}

function useOptionalAppUpdateContext() {
  return useContext(AppUpdateContext)
}

export function useAppUpdate() {
  const { hasDirtyForms, isUpdatePending, requestAppUpdate } = useAppUpdateContext()

  return {
    hasDirtyForms,
    isUpdatePending,
    requestAppUpdate,
  }
}

export function useDirtyFormState(isDirty: boolean, enabled = true) {
  const context = useOptionalAppUpdateContext()
  const reactId = useId()
  const formIdRef = useRef(reactId)

  useEffect(() => {
    if (!context) {
      return
    }

    const formId = formIdRef.current
    const { setDirtyFormState, clearDirtyFormState } = context

    if (!enabled) {
      clearDirtyFormState(formId)
      return
    }

    setDirtyFormState(formId, isDirty)

    return () => {
      clearDirtyFormState(formId)
    }
  }, [context, enabled, isDirty])
}
