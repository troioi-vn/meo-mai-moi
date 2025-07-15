import * as React from 'react'

interface FormFieldContextValue {
  name: string
}

export const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)
