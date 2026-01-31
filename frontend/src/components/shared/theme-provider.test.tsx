import { render, screen, fireEvent } from '@/testing'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, ThemeProviderContext } from './theme-provider'

describe('ThemeProvider', () => {
  const localStorageKey = 'test-theme'
  const mockChildren = <div data-testid="children">Test Children</div>

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads default theme if no theme is stored in localStorage', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )
    expect(document.documentElement).toHaveClass('light')
  })

  it('loads stored theme from localStorage', () => {
    localStorage.setItem(localStorageKey, 'dark')
    render(
      <ThemeProvider defaultTheme="light" storageKey={localStorageKey}>
        {mockChildren}
      </ThemeProvider>
    )
    expect(document.documentElement).toHaveClass('dark')
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
    expect(localStorage.getItem(localStorageKey)).toBe('dark')
  })

  it('switches theme to system and applies system preference', () => {
    // Mock system to prefer dark
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
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
    expect(document.documentElement).toHaveClass('dark') // System preference is dark
    expect(localStorage.getItem(localStorageKey)).toBe('system')
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
