import { createContext, useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  getThemeSnapshot,
  initializeThemeRuntime,
  setTheme as persistTheme,
  subscribeToTheme,
  type Theme,
  type ResolvedTheme,
} from '@/lib/theme-runtime'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export interface ThemeProviderState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export { ThemeProviderContext }

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    () => getThemeSnapshot({ defaultTheme, storageKey }),
    () => getThemeSnapshot({ defaultTheme, storageKey })
  )

  useEffect(() => {
    initializeThemeRuntime({ defaultTheme, storageKey })
  }, [defaultTheme, storageKey])

  const value = useMemo(
    () => ({
      theme: snapshot.theme,
      resolvedTheme: snapshot.resolvedTheme,
      setTheme: persistTheme,
    }),
    [snapshot]
  )

  return <ThemeProviderContext value={value}>{children}</ThemeProviderContext>
}
