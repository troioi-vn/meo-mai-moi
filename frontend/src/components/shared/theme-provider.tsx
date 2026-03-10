import { useEffect } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#020817',
  light: '#ffffff',
}

const MANIFESTS: Record<ResolvedTheme, string> = {
  dark: '/site-dark.webmanifest',
  light: '/site-light.webmanifest',
}

function ThemeEffects() {
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedTheme) {
      return
    }

    const normalizedTheme = (theme ?? 'system') as Theme
    const normalizedResolvedTheme = resolvedTheme as ResolvedTheme
    const root = document.documentElement

    root.dataset.theme = normalizedResolvedTheme
    root.dataset.themePreference = normalizedTheme
    root.style.colorScheme = normalizedResolvedTheme

    document.body.dataset.theme = normalizedResolvedTheme
    document.body.style.colorScheme = normalizedResolvedTheme

    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', THEME_COLORS[normalizedResolvedTheme])
    }

    const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
    if (colorSchemeMeta) {
      colorSchemeMeta.setAttribute('content', normalizedResolvedTheme)
    }

    const manifestEl = document.getElementById('app-manifest')
    if (manifestEl instanceof HTMLLinkElement) {
      manifestEl.href = MANIFESTS[normalizedResolvedTheme]
    }
  }, [resolvedTheme, theme])

  return null
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      disableTransitionOnChange
      enableSystem
      storageKey={storageKey}
    >
      <ThemeEffects />
      {children}
    </NextThemesProvider>
  )
}
