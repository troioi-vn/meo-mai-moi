import { useTheme as useNextTheme } from 'next-themes'
import type { Theme, ResolvedTheme } from '@/components/shared/theme-provider'

export function useTheme() {
  const themeState = useNextTheme()

  return {
    ...themeState,
    theme: (themeState.theme ?? 'system') as Theme,
    resolvedTheme: (themeState.resolvedTheme ?? 'light') as ResolvedTheme,
    systemTheme: themeState.systemTheme as ResolvedTheme | undefined,
    setTheme: themeState.setTheme as (theme: Theme) => void,
  }
}
