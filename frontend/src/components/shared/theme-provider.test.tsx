import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, ThemeProviderContext } from './theme-provider'

describe('ThemeProvider', () => {
  const localStorageKey = 'test-theme'
  const mockChildren = <div data-testid="children">Test Children</div>
  let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.themePreference
    document.documentElement.style.colorScheme = ''
    document.body.dataset.theme = ''
    document.body.style.colorScheme = ''
    document.head.innerHTML = `
      <link rel="manifest" id="app-manifest" href="/site-light.webmanifest" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="color-scheme" content="light" />
    `

    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener: (event: MediaQueryListEvent) => void) => {
        systemThemeListener = listener
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    systemThemeListener = null
    vi.restoreAllMocks()
  })

  it('loads default theme if no theme is stored in localStorage', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.themePreference).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('loads stored theme from localStorage', () => {
    localStorage.setItem(localStorageKey, 'dark')
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themePreference).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('switches theme to light', () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey={localStorageKey}>
        <ThemeProviderContext.Consumer>
          {({ setTheme }) => (
            <button
              type="button"
              onClick={() => {
                setTheme('light')
              }}
            >
              Set Light
            </button>
          )}
        </ThemeProviderContext.Consumer>
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText('Set Light'))
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.themePreference).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(localStorage.getItem(localStorageKey)).toBe('light')
  })

  it('switches theme to dark', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        <ThemeProviderContext.Consumer>
          {({ setTheme }) => (
            <button
              type="button"
              onClick={() => {
                setTheme('dark')
              }}
            >
              Set Dark
            </button>
          )}
        </ThemeProviderContext.Consumer>
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText('Set Dark'))
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themePreference).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(localStorageKey)).toBe('dark')
  })

  it('exposes saved theme and resolved theme for system mode', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener: (event: MediaQueryListEvent) => void) => {
        systemThemeListener = listener
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        <ThemeProviderContext.Consumer>
          {({ setTheme }) => (
            <button
              type="button"
              onClick={() => {
                setTheme('system')
              }}
            >
              Set System
            </button>
          )}
        </ThemeProviderContext.Consumer>
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText('Set System'))
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.themePreference).toBe('system')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(localStorageKey)).toBe('system')
  })

  it('updates manifest and meta side effects from the resolved theme', () => {
    localStorage.setItem(localStorageKey, 'dark')

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )

    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#020817')
    expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark')
    expect(document.getElementById('app-manifest')).toHaveAttribute('href', '/site-dark.webmanifest')
    expect(document.body.dataset.theme).toBe('dark')
    expect(document.body.style.colorScheme).toBe('dark')
  })

  it('reacts to system theme changes while saved theme is system', async () => {
    localStorage.setItem(localStorageKey, 'system')
    let prefersDark = false

    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_type, listener: (event: MediaQueryListEvent) => void) => {
        systemThemeListener = listener
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )

    expect(document.documentElement.dataset.theme).toBe('light')

    prefersDark = true
    systemThemeListener?.({ matches: true } as MediaQueryListEvent)

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
  })

  it('reacts to theme changes from storage events', async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )

    localStorage.setItem(localStorageKey, 'dark')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: localStorageKey,
        newValue: 'dark',
      })
    )

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark')
    })
  })

  it('renders children', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )
    expect(screen.getByTestId('children')).toBeInTheDocument()
  })
})
