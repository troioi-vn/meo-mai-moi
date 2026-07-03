import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { usePwaInstall } from './use-pwa-install'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('usePwaInstall', () => {
  let originalUserAgent: string
  let originalMaxTouchPoints: number

  beforeEach(() => {
    originalUserAgent = navigator.userAgent
    originalMaxTouchPoints = navigator.maxTouchPoints

    vi.clearAllMocks()

    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      maxTouchPoints: 0,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: originalMaxTouchPoints })
  })

  it('does not expose app-owned install UI on desktop Chromium', () => {
    const { result } = renderHook(() => usePwaInstall(false))

    expect(result.current.installMode).toBe('none')
    expect(result.current.canInstall).toBe(false)
    expect(result.current.showBanner).toBe(false)
  })

  it('does not intercept beforeinstallprompt for Chromium browsers', () => {
    const { result } = renderHook(() => usePwaInstall(true))
    const mockEvent = new Event('beforeinstallprompt')
    const preventDefault = vi.fn()
    mockEvent.preventDefault = preventDefault

    window.dispatchEvent(mockEvent)

    expect(preventDefault).not.toHaveBeenCalled()
    expect(result.current.installMode).toBe('none')
    expect(result.current.canInstall).toBe(false)
  })

  it('shows iOS Safari instruction mode', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
    })

    const { result } = renderHook(() => usePwaInstall(true))

    expect(result.current.installMode).toBe('ios-safari')
    expect(result.current.canInstall).toBe(true)
    expect(result.current.showBanner).toBe(false)
  })

  it('shows iOS in-app instruction mode for Instagram browser', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 320.0.0.0.8',
      maxTouchPoints: 5,
    })

    const { result } = renderHook(() => usePwaInstall(true))

    expect(result.current.installMode).toBe('ios-in-app')
    expect(result.current.canInstall).toBe(true)
    expect(result.current.showBanner).toBe(false)
  })

  it('does not show instructions if already installed', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      maxTouchPoints: 5,
    })
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result } = renderHook(() => usePwaInstall(true))

    expect(result.current.installMode).toBe('none')
    expect(result.current.canInstall).toBe(false)
  })
})
