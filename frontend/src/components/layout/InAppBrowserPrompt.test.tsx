import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@/testing'
import { InAppBrowserPrompt } from './InAppBrowserPrompt'

const mocks = vi.hoisted(() => ({
  user: null as { id: number } | null,
  createSessionHandoff: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('@/api/telegram-handoff', () => ({ createSessionHandoff: mocks.createSessionHandoff }))

const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'

function setEnvironment(userAgent: string, search: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  window.history.replaceState({}, '', `/account/pets${search}`)
}

describe('InAppBrowserPrompt', () => {
  beforeEach(() => {
    mocks.user = { id: 1 }
    mocks.createSessionHandoff.mockReset()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // next-themes still reaches for the deprecated listener API.
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers a way out when a Telegram link lands in an in-app webview', async () => {
    setEnvironment(ANDROID_WEBVIEW, '?from=telegram')

    render(<InAppBrowserPrompt />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("You're in Telegram's browser")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open in your browser/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy sign-in link/ })).toBeInTheDocument()
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
  })

  it('consumes the marker so a reload does not re-open it', async () => {
    setEnvironment(ANDROID_WEBVIEW, '?from=telegram&tab=health')

    render(<InAppBrowserPrompt />)

    await screen.findByRole('dialog')
    await waitFor(() => {
      expect(window.location.search).toBe('?tab=health')
    })
  })

  it('stays out of the way in a real browser', () => {
    setEnvironment(ANDROID_CHROME, '?from=telegram')

    render(<InAppBrowserPrompt />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays out of the way on a normal page load inside the webview', () => {
    setEnvironment(ANDROID_WEBVIEW, '')

    render(<InAppBrowserPrompt />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not prompt a signed-out visitor', () => {
    mocks.user = null
    setEnvironment(ANDROID_WEBVIEW, '?from=telegram')

    render(<InAppBrowserPrompt />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
