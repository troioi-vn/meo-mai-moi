import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useTelegramLoginHandshake } from './use-telegram-login-handshake'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  loadUser: vi.fn(),
  navigate: vi.fn(),
  // `loadUser` resolves for anonymous sessions too, so the mocked auth state — not the
  // promise — decides whether the browser has been signed in.
  user: null as { id: number } | null,
}))

vi.mock('@/api/generated/authentication/authentication', () => ({
  usePostAuthTelegramHandshake: () => ({ mutateAsync: mocks.create }),
}))
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ loadUser: mocks.loadUser, user: mocks.user }),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
}

describe('useTelegramLoginHandshake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.user = null
    setVisibility('visible')
  })

  afterEach(() => vi.restoreAllMocks())

  it('opens Telegram synchronously and sends the invitation context', async () => {
    const telegramWindow = { closed: false, location: { href: '' }, opener: window }
    vi.spyOn(window, 'open').mockReturnValue(telegramWindow as unknown as Window)
    mocks.create.mockResolvedValue({
      nonce: 'nonce-1',
      expires_in: 300,
      deep_link: 'https://t.me/meo_bot?start=hs_nonce-1',
    })

    const { result } = renderHook(() =>
      useTelegramLoginHandshake({
        locale: 'en',
        redirectPath: '/account',
        invitationCode: 'invite-code',
      })
    )
    await act(async () => result.current.start())

    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(mocks.create).toHaveBeenCalledWith({
      data: { locale: 'en', redirect_path: '/account', invitation_code: 'invite-code' },
    })
    expect(result.current.status).toBe('waiting')
    expect(result.current.deepLink).toBe('https://t.me/meo_bot?start=hs_nonce-1')
    expect(telegramWindow.location.href).toBe('https://t.me/meo_bot?start=hs_nonce-1')
  })

  it('checks the existing browser session when the page regains focus', async () => {
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      location: {},
      opener: window,
    } as Window)
    mocks.create.mockResolvedValue({
      nonce: 'nonce-2',
      expires_in: 300,
      deep_link: 'https://t.me/bot',
    })
    mocks.loadUser.mockImplementation(async () => {
      mocks.user = { id: 1 }
    })

    const { result, rerender } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'vi', redirectPath: '/fallback' })
    )
    await act(async () => result.current.start())
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    await act(async () => {
      rerender()
    })

    expect(mocks.loadUser).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith('/fallback')
    expect(result.current.status).toBe('approved')
  })

  it('keeps waiting when the original browser has not received a session', async () => {
    vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
      location: {},
      opener: window,
    } as Window)
    mocks.create.mockResolvedValue({
      nonce: 'nonce-3',
      expires_in: 300,
      deep_link: 'https://t.me/bot',
    })
    // The real `loadUser` resolves for anonymous sessions instead of throwing.
    mocks.loadUser.mockResolvedValue(undefined)

    const { result, rerender } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'uk', redirectPath: '/' })
    )
    await act(async () => result.current.start())
    await act(async () => {
      window.dispatchEvent(new Event('pageshow'))
      await Promise.resolve()
    })
    await act(async () => {
      rerender()
    })

    expect(mocks.loadUser).toHaveBeenCalledOnce()
    expect(result.current.status).toBe('waiting')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
