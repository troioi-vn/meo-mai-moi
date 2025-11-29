import { use } from 'react'
import { ThemeProviderContext } from '@/components/shared/theme-provider'

export function useTheme() {
  const context = use(ThemeProviderContext)
  return context
}
