import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { AuthContextType } from '@/contexts/auth-context'

const { mockApiPost, mockCsrf } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
  mockCsrf: vi.fn(),
}))

vi.mock('@/api/axios', () => ({
  api: {
    post: mockApiPost,
  },
  csrf: mockCsrf,
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@/hooks/use-auth'
import { useTelegramMiniAppAuth } from './use-telegram-miniapp-auth'

describe('useTelegramMiniAppAuth', () => {
  const mockLoadUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    window.Telegram = undefined

    const authMock: AuthContextType = {
      user: null,
      status: 'authenticated',
      isAuthenticated: true,
      isLoading: false,
      isRecovering: false,
      isSessionFromCache: false,
      loadUser: mockLoadUser,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    }

    vi.mocked(useAuth).mockReturnValue(authMock)

    mockCsrf.mockResolvedValue(undefined)
    mockApiPost.mockResolvedValue({ success: true })

    window.history.pushState({}, '', '/?tg_token=token-from-telegram')
  })

  afterEach(() => {
    vi.useRealTimers()
    window.Telegram = undefined
  })

  it('authenticates with tg_token even when already authenticated', async () => {
    renderHook(() => useTelegramMiniAppAuth())

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/auth/telegram/token', {
        token: 'token-from-telegram',
      })
    })

    expect(mockCsrf).toHaveBeenCalledTimes(1)
    expect(mockLoadUser).toHaveBeenCalledTimes(1)
  })

  it('notifies the Telegram host only once while polling for delayed initData', () => {
    vi.useFakeTimers()
    const ready = vi.fn()
    const expand = vi.fn()
    window.Telegram = {
      WebApp: {
        initData: '',
        ready,
        expand,
      },
    }
    window.history.pushState({}, '', '/')

    renderHook(() => useTelegramMiniAppAuth({ autoAuthenticate: false }))

    expect(ready).toHaveBeenCalledTimes(1)
    expect(expand).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)

    expect(ready).toHaveBeenCalledTimes(1)
    expect(expand).toHaveBeenCalledTimes(1)
  })
})
