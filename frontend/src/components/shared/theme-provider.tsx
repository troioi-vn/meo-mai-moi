import { createContext, useEffect, useState, useMemo } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export { ThemeProviderContext }

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored && ['dark', 'light', 'system'].includes(stored)) {
      return stored as Theme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    let effectiveTheme: 'dark' | 'light'
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

      root.classList.add(effectiveTheme)
    } else {
      effectiveTheme = theme
      root.classList.add(theme)
    }

    // Update theme-color meta tag dynamically
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      const themeColor = effectiveTheme === 'dark' ? '#020817' : '#ffffff'
      themeColorMeta.setAttribute('content', themeColor)
    }

    // Update manifest when theme changes
    if (typeof window.__updateManifest === 'function') {
      window.__updateManifest()
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (theme: Theme) => {
        localStorage.setItem(storageKey, theme)
        setTheme(theme)
      },
    }),
    [theme, storageKey]
  )

  return (
    <ThemeProviderContext {...props} value={value}>
      {children}
    </ThemeProviderContext>
  )
}
