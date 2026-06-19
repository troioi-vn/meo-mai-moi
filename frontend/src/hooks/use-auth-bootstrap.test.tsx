import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

const mockedApiGet = vi.hoisted(() => vi.fn())
const mockedCsrf = vi.hoisted(() => vi.fn())
const mockedSetUnauthorizedHandler = vi.hoisted(() => vi.fn())

vi.mock('@/api/axios', () => ({
  api: { get: mockedApiGet },
  authApi: { post: vi.fn().mockResolvedValue({}) },
  csrf: mockedCsrf,
  setUnauthorizedHandler: mockedSetUnauthorizedHandler,
  SKIP_UNAUTHORIZED_REDIRECT_HEADER: 'X-Skip-Unauthorized-Redirect',
}))

vi.mock('@/lib/query-cache', () => ({
  clearOfflineCache: vi.fn().mockResolvedValue(undefined),
  hasPersistedAuthenticatedQueryCache: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/pwa', () => ({
  isStandalonePwa: vi.fn().mockReturnValue(false),
}))

import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/use-auth'
import { ACTIVE_AUTH_USER_ID_STORAGE_KEY, clearAuthRecoveryHints } from '@/lib/auth-identity-cache'

function AuthStatus() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>loading</div>
  }

  return <div>{user ? `user:${user.email}` : 'guest'}</div>
}

describe('useAuthBootstrap integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    clearAuthRecoveryHints()
    mockedCsrf.mockResolvedValue(undefined)
  })

  it('retries /users/me once after a startup 401', async () => {
    mockedApiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({ id: 1, email: 'retry@example.com' })

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:retry@example.com')).toBeInTheDocument()
    })

    expect(mockedCsrf).toHaveBeenCalledTimes(2)
    expect(mockedApiGet).toHaveBeenCalledTimes(2)
  })

  it('keeps loading during double 401 when cached identity exists', async () => {
    mockedApiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, '1')

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(screen.queryByText('guest')).not.toBeInTheDocument()
  })

  it('registers and clears the global unauthorized handler on unmount', async () => {
    mockedApiGet.mockResolvedValueOnce({ id: 1, email: 'test@example.com' })

    const { unmount } = render(
      <AuthProvider>
        <div>auth</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockedSetUnauthorizedHandler).toHaveBeenCalledOnce()
    })

    unmount()

    expect(mockedSetUnauthorizedHandler).toHaveBeenLastCalledWith(null)
  })
})
