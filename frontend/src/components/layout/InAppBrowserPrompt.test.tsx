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
const TELEGRAM_ANDROID_REAL =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36'
const IOS_TELEGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'

function setEnvironment(userAgent: string, search: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 })
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
    expect(screen.getByText(/Install and create shortcut/)).toBeInTheDocument()
  })

  it('consumes the marker so a reload does not re-open it', async () => {
    setEnvironment(ANDROID_WEBVIEW, '?from=telegram&tab=health')

    render(<InAppBrowserPrompt />)

    await screen.findByRole('dialog')
    await waitFor(() => {
      expect(window.location.search).toBe('?tab=health')
    })
  })

  it('still offers help when the browser is indistinguishable from Chrome', async () => {
    // Telegram's in-app browser sends exactly this user agent, so refusing to show the prompt
    // without positive detection would mean never showing it at all.
    setEnvironment(TELEGRAM_ANDROID_REAL, '?from=telegram')

    render(<InAppBrowserPrompt />)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copy sign-in link/ })).toBeInTheDocument()
    expect(screen.getByText(/Install and create shortcut/)).toBeInTheDocument()
  })

  it('hides the escape button where no scheme can work', async () => {
    // A Chrome Custom Tab is Chrome, so an intent:// for an https URL lands right back in it.
    // A button that can only reload the page is worse than no button.
    setEnvironment(TELEGRAM_ANDROID_REAL, '?from=telegram')

    render(<InAppBrowserPrompt />)

    await screen.findByRole('dialog')
    expect(screen.queryByRole('button', { name: /Open in your browser/ })).not.toBeInTheDocument()
  })

  it('offers Safari on iOS, where the webview really is a separate browser', async () => {
    setEnvironment(IOS_TELEGRAM, '?from=telegram')

    render(<InAppBrowserPrompt />)

    await screen.findByRole('dialog')
    expect(screen.getByRole('button', { name: /Open in Safari/ })).toBeInTheDocument()
  })

  it('does not claim the user is inside Telegram when nothing proves it', async () => {
    setEnvironment(ANDROID_CHROME, '?from=telegram')

    render(<InAppBrowserPrompt />)

    await screen.findByRole('dialog')
    expect(screen.getByText('Keep Meo Mai Moi handy')).toBeInTheDocument()
    expect(screen.queryByText("You're in Telegram's browser")).not.toBeInTheDocument()
  })

  it('does not prompt inside an installed PWA', () => {
    setEnvironment(TELEGRAM_ANDROID_REAL, '?from=telegram')
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList)

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
