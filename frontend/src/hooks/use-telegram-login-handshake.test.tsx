import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useTelegramLoginHandshake } from './use-telegram-login-handshake'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  claim: vi.fn(),
  loadUser: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/api/generated/authentication/authentication', () => ({
  usePostAuthTelegramHandshake: () => ({ mutateAsync: mocks.create }),
  usePostAuthTelegramHandshakeNonce: () => ({ mutateAsync: mocks.claim }),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ loadUser: mocks.loadUser }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
}

function mockTelegramWindow() {
  const telegramWindow = {
    closed: false,
    close: vi.fn(),
    location: { href: '' },
    opener: window,
  }
  vi.spyOn(window, 'open').mockReturnValue(telegramWindow as unknown as Window)
  return telegramWindow
}

describe('useTelegramLoginHandshake', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    setVisibility('visible')
    mocks.loadUser.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a window synchronously, then sends it to the generated deep link', async () => {
    const telegramWindow = mockTelegramWindow()
    let resolveCreate!: (value: {
      nonce: string
      user_code: string
      expires_in: number
      deep_link: string
    }) => void
    mocks.create.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )

    const { result } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'en', redirectPath: '/account' })
    )

    let startPromise!: Promise<void>
    act(() => {
      startPromise = result.current.start()
    })
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(result.current.status).toBe('starting')

    await act(async () => {
      resolveCreate({
        nonce: 'nonce-1',
        user_code: 'MEO2',
        expires_in: 300,
        deep_link: 'https://t.me/meo_bot?start=hs_nonce-1',
      })
      await startPromise
    })

    expect(mocks.create).toHaveBeenCalledWith({
      data: { locale: 'en', redirect_path: '/account' },
    })
    expect(result.current.status).toBe('waiting')
    expect(result.current.userCode).toBe('MEO2')
    expect(telegramWindow.location.href).toBe('https://t.me/meo_bot?start=hs_nonce-1')
  })

  it('polls every three seconds only while visible and checks immediately on return', async () => {
    mockTelegramWindow()
    mocks.create.mockResolvedValue({
      nonce: 'nonce-2',
      user_code: 'CAT2',
      expires_in: 300,
      deep_link: 'https://t.me/meo_bot?start=hs_nonce-2',
    })
    mocks.claim
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'approved', redirect_path: '/from-server' })

    const { result } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'vi', redirectPath: '/fallback' })
    )
    await act(async () => result.current.start())

    await act(async () => vi.advanceTimersByTimeAsync(2_999))
    expect(mocks.claim).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(mocks.claim).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await act(async () => vi.advanceTimersByTimeAsync(6_000))
    expect(mocks.claim).toHaveBeenCalledTimes(1)

    setVisibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(mocks.claim).toHaveBeenCalledTimes(2)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.loadUser).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledWith('/from-server')
    expect(result.current.status).toBe('approved')
  })

  it('stops on cancellation and allows a retry', async () => {
    mockTelegramWindow()
    mocks.create.mockResolvedValue({
      nonce: 'nonce-cancelled',
      user_code: 'PAW2',
      expires_in: 300,
      deep_link: 'https://t.me/meo_bot?start=hs_nonce-cancelled',
    })
    mocks.claim.mockResolvedValue({ status: 'cancelled' })

    const { result } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'uk', redirectPath: '/' })
    )
    await act(async () => result.current.start())
    await act(async () => {
      window.dispatchEvent(new Event('pageshow'))
      await Promise.resolve()
    })

    expect(result.current.status).toBe('cancelled')
    expect(mocks.claim).toHaveBeenCalledOnce()

    await act(async () => result.current.start())
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('waiting')
  })

  it('expires locally even while the page is hidden', async () => {
    mockTelegramWindow()
    mocks.create.mockResolvedValue({
      nonce: 'nonce-expiring',
      user_code: 'PET2',
      expires_in: 5,
      deep_link: 'https://t.me/meo_bot?start=hs_nonce-expiring',
    })

    const { result } = renderHook(() =>
      useTelegramLoginHandshake({ locale: 'ru', redirectPath: '/' })
    )
    await act(async () => result.current.start())
    setVisibility('hidden')
    await act(async () => vi.advanceTimersByTimeAsync(5_000))

    expect(result.current.status).toBe('expired')
    expect(result.current.userCode).toBe('PET2')
    expect(mocks.claim).not.toHaveBeenCalled()
  })
})
