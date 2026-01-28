import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    localStorage.clear()

    // Default to non-mobile
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      maxTouchPoints: 0,
    })

    // Default screen width
    vi.stubGlobal('innerWidth', 1024)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // Restore original navigator properties if needed
    Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: originalMaxTouchPoints })
  })

  it('initially does not show banner', () => {
    const { result } = renderHook(() => usePwaInstall(false))
    expect(result.current.showBanner).toBe(false)
  })

  it('shows banner on mobile when prompt is available and authenticated', async () => {
    // Mock mobile device
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('innerWidth', 375)

    const { result } = renderHook(() => usePwaInstall(true))

    // Simulate beforeinstallprompt event
    const mockEvent = new Event('beforeinstallprompt')
    mockEvent.preventDefault = vi.fn()

    act(() => {
      window.dispatchEvent(mockEvent)
    })

    expect(result.current.showBanner).toBe(true)
    expect(result.current.canInstall).toBe(true)
  })

  it('does not show banner if already installed', () => {
    // Mock mobile device
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('innerWidth', 375)

    // Mock installed state
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

    const mockEvent = new Event('beforeinstallprompt')
    act(() => {
      window.dispatchEvent(mockEvent)
    })

    expect(result.current.showBanner).toBe(false)
  })

  it('does not show banner if dismissed within 30 days', () => {
    // Mock mobile device
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('innerWidth', 375)

    // Set dismissal in localStorage (1 day ago)
    localStorage.setItem('pwa-install-dismissed', (Date.now() - 24 * 60 * 60 * 1000).toString())

    const { result } = renderHook(() => usePwaInstall(true))

    const mockEvent = new Event('beforeinstallprompt')
    act(() => {
      window.dispatchEvent(mockEvent)
    })

    expect(result.current.showBanner).toBe(false)
  })

  it('triggers install prompt when triggerInstall is called', async () => {
    // Mock mobile device to simulate realistic conditions
    vi.stubGlobal('navigator', {
      userAgent: 'iPhone',
      maxTouchPoints: 5,
    })
    vi.stubGlobal('innerWidth', 375)

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' })

    const { result } = renderHook(() => usePwaInstall(true))

    const mockEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => void
      userChoice: Promise<{ outcome: string }>
    }
    mockEvent.prompt = mockPrompt
    mockEvent.userChoice = mockUserChoice

    act(() => {
      window.dispatchEvent(mockEvent)
    })

    await act(async () => {
      await result.current.triggerInstall()
    })

    // Verify that the prompt was called when triggerInstall was invoked
    expect(mockPrompt).toHaveBeenCalled()
  })

  it('persists dismissal when dismissBanner is called', () => {
    const { result } = renderHook(() => usePwaInstall(true))

    act(() => {
      result.current.dismissBanner()
    })

    expect(localStorage.getItem('pwa-install-dismissed')).toBeDefined()
    expect(result.current.showBanner).toBe(false)
  })
})
