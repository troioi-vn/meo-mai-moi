import { useEffect, useState } from 'react'

/**
 * A small enum-valued display preference backed by localStorage, so the user's
 * choice survives a reload. Used for chart ranges and list sort direction.
 */
export function usePersistedChoice<T extends string>(
  storageKey: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return isValid(stored) ? stored : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value)
    } catch {
      // ignore storage errors
    }
  }, [storageKey, value])

  return [value, setValue] as const
}
