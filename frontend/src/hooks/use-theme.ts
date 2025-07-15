import { useContext } from 'react'
import { ThemeProviderContext } from '@/components/theme-provider'

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  return context
}
