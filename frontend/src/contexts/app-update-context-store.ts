import React from 'react'

export interface AppUpdateContextValue {
  hasDirtyForms: boolean
  isUpdatePending: boolean
  requestAppUpdate: () => void
  setDirtyFormState: (formId: string, isDirty: boolean) => void
  clearDirtyFormState: (formId: string) => void
}

export const AppUpdateContext = React.createContext<AppUpdateContextValue | null>(null)
