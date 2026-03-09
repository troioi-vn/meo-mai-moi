import { use } from 'react'
import { ThemeProviderContext } from '@/components/shared/theme-provider'

export function useTheme() {
  const context = use(ThemeProviderContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
