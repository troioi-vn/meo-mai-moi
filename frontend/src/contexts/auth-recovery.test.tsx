import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

vi.mock('@/api/axios', () => ({
  api: { get: vi.fn() },
  authApi: { post: vi.fn().mockResolvedValue({}) },
  csrf: vi.fn().mockResolvedValue(undefined),
  setUnauthorizedHandler: vi.fn(),
  SKIP_UNAUTHORIZED_REDIRECT_HEADER: 'X-Skip-Unauthorized-Redirect',
}))

vi.mock('@/api/generated/user-profile/user-profile', () => ({
  putUsersMePassword: vi.fn(),
  deleteUsersMe: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/query-cache', () => ({
  clearOfflineCache: vi.fn().mockResolvedValue(undefined),
  hasPersistedAuthenticatedQueryCache: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/pwa', () => ({
  isStandalonePwa: vi.fn().mockReturnValue(false),
}))

import { render, screen, waitFor } from '@testing-library/react'
import { clearAuthRecoveryHints } from '@/lib/auth-identity-cache'
import { AuthProvider } from './AuthContext'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/api/axios'

function AuthStatus() {
  const { user, isLoading, status } = useAuth()

  if (isLoading) {
    return <div>loading:{status}</div>
  }

  return <div>{user ? `user:${user.email}` : `guest:${status}`}</div>
}

describe('AuthProvider recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    clearAuthRecoveryHints()
  })

  it.each([
    {
      label: 'regular user',
      response: { id: 1, email: 'rescue@example.com', roles: [] },
    },
    {
      label: 'super admin',
      response: { id: 1, email: 'admin@example.com', roles: ['super_admin'] },
    },
  ])(
    'recovers startup auth the same way for a $label when cached identity exists',
    async ({ response }) => {
      const apiGet = vi.spyOn(api, 'get')

      apiGet
        .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
        .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
        .mockResolvedValueOnce(response)

      window.localStorage.setItem('meo-active-auth-user-id', '1')

      render(
        <AuthProvider>
          <AuthStatus />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(apiGet).toHaveBeenCalledTimes(2)
      })

      expect(screen.getByText('loading:recovering')).toBeInTheDocument()
      expect(screen.queryByText(/^guest:/)).not.toBeInTheDocument()

      await waitFor(
        () => {
          expect(screen.getByText(`user:${response.email}`)).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      expect(apiGet).toHaveBeenCalledTimes(3)
    }
  )

  it('keeps known authenticated browsers in loading state during transient startup 401 recovery', async () => {
    const apiGet = vi.spyOn(api, 'get')

    apiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockResolvedValueOnce({ id: 1, email: 'rescue@example.com' })

    window.localStorage.setItem('meo-active-auth-user-id', '1')

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledTimes(2)
    })

    expect(screen.getByText('loading:recovering')).toBeInTheDocument()
    expect(screen.queryByText(/^guest:/)).not.toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByText('user:rescue@example.com')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(apiGet).toHaveBeenCalledTimes(3)
  })

  it('keeps known authenticated browsers in loading state during transient startup network recovery', async () => {
    const apiGet = vi.spyOn(api, 'get')

    apiGet
      .mockRejectedValueOnce({ isAxiosError: true, request: {}, message: 'Network Error' })
      .mockResolvedValueOnce({ id: 1, email: 'rescue@example.com' })

    window.localStorage.setItem('meo-active-auth-user-id', '1')

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledOnce()
    })

    expect(screen.getByText('loading:recovering')).toBeInTheDocument()
    expect(screen.queryByText(/^guest:/)).not.toBeInTheDocument()

    await waitFor(
      () => {
        expect(screen.getByText('user:rescue@example.com')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('does not delay real guests when no previous authenticated identity is cached', async () => {
    const apiGet = vi.spyOn(api, 'get')

    apiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('guest:anonymous')).toBeInTheDocument()
    })

    expect(apiGet).toHaveBeenCalledTimes(2)
  })

  it('starts in unknown status before bootstrap resolves', async () => {
    const apiGet = vi.spyOn(api, 'get').mockImplementation(() => new Promise(() => {}))

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    expect(screen.getByText('loading:unknown')).toBeInTheDocument()

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledOnce()
    })
  })
})
