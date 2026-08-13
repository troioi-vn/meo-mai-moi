import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vite-plus/test'
import { buildEscapeUrl, useBrowserHandoff } from './use-browser-handoff'
import { getBrowserEnvironment } from '@/lib/browser-environment'

const mocks = vi.hoisted(() => ({ createSessionHandoff: vi.fn() }))

vi.mock('@/api/telegram-handoff', () => ({
  createSessionHandoff: mocks.createSessionHandoff,
}))

const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 13; SM-S901B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36'
const IOS_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'

describe('buildEscapeUrl', () => {
  it('rewrites to the Safari scheme on iOS', () => {
    const url = buildEscapeUrl(
      'https://app.test/auth/telegram/return?token=abc',
      getBrowserEnvironment({ userAgent: IOS_WEBVIEW, maxTouchPoints: 5 })
    )

    expect(url).toBe('x-safari-https://app.test/auth/telegram/return?token=abc')
  })

  it('builds an Android intent url that keeps the token and carries a fallback', () => {
    const url = buildEscapeUrl(
      'https://app.test/auth/telegram/return?token=abc',
      getBrowserEnvironment({ userAgent: ANDROID_WEBVIEW })
    )

    expect(url).toContain('intent://app.test/auth/telegram/return?token=abc#Intent;scheme=https;')
    expect(url).toContain(
      `S.browser_fallback_url=${encodeURIComponent('https://app.test/auth/telegram/return?token=abc')}`
    )
    expect(url?.endsWith(';end')).toBe(true)
  })

  it('returns null where no escape scheme exists', () => {
    const url = buildEscapeUrl(
      'https://app.test/x',
      getBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      })
    )

    expect(url).toBeNull()
  })
})

describe('useBrowserHandoff', () => {
  let navigations: string[]

  beforeEach(() => {
    navigations = []
    mocks.createSessionHandoff.mockReset()
    mocks.createSessionHandoff.mockImplementation(() =>
      Promise.resolve({ url: `https://app.test/auth/telegram/return?token=t${navigations.length}` })
    )

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/account/pets',
        search: '',
        hash: '',
        set href(value: string) {
          navigations.push(value)
        },
        get href() {
          return 'https://app.test/account/pets'
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mints a fresh token for every action rather than reusing one', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { result } = renderHook(() => useBrowserHandoff())

    await act(async () => {
      await result.current.copyLink()
    })
    await act(async () => {
      await result.current.copyLink()
    })

    // Handoff tokens are single-use, so a shared one would leave the second tap dead.
    expect(mocks.createSessionHandoff).toHaveBeenCalledTimes(2)
    await waitFor(() => {
      expect(result.current.status).toBe('copied')
    })
  })

  it('sends the current path along so the other browser lands where the user was', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { result } = renderHook(() => useBrowserHandoff())

    await act(async () => {
      await result.current.copyLink()
    })

    expect(mocks.createSessionHandoff).toHaveBeenCalledWith('/account/pets')
  })

  it('exposes the raw link when the clipboard is refused', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const { result } = renderHook(() => useBrowserHandoff())

    await act(async () => {
      await result.current.copyLink()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(result.current.fallbackUrl).toContain('/auth/telegram/return?token=')
  })

  it('navigates to the escape scheme and still reveals the plain link', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: ANDROID_WEBVIEW,
    })
    const { result } = renderHook(() => useBrowserHandoff())

    await act(async () => {
      await result.current.openInSystemBrowser()
    })

    expect(navigations[0]).toContain('intent://')
    // We cannot observe whether the webview honoured it, so the manual way out stays visible.
    expect(result.current.fallbackUrl).toContain('https://app.test/auth/telegram/return?token=')
  })
})
