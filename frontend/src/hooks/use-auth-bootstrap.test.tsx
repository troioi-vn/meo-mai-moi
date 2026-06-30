import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'

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

const mockClearMediaUploadQueue = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@/lib/query-cache', () => ({
  clearOfflineCache: vi.fn().mockResolvedValue(undefined),
  hasPersistedAuthenticatedQueryCache: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/lib/media-upload-queue', () => ({
  clearMediaUploadQueue: mockClearMediaUploadQueue,
}))

import { hasPersistedAuthenticatedQueryCache } from '@/lib/query-cache'
import { clearMediaUploadQueue } from '@/lib/media-upload-queue'

vi.mock('@/pwa', () => ({
  isStandalonePwa: vi.fn().mockReturnValue(false),
}))

import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/use-auth'
import {
  ACTIVE_AUTH_USER_ID_STORAGE_KEY,
  clearAuthRecoveryHints,
  readCachedAuthUser,
  writeCachedAuthUser,
} from '@/lib/auth-identity-cache'
import type { User } from '@/types/user'

const cachedUser: User = {
  id: 1,
  name: 'Cached User',
  email: 'cached@example.com',
  email_verified_at: '2026-01-01T00:00:00Z',
  is_banned: false,
}

function AuthStatus() {
  const { user, isLoading, isSessionFromCache, loadUser } = useAuth()

  if (isLoading) {
    return <div>loading</div>
  }

  return (
    <div>
      <div>{user ? `user:${user.email}` : 'guest'}</div>
      <div>{isSessionFromCache ? 'cache-session' : 'server-session'}</div>
      <button type="button" onClick={() => void loadUser()}>
        reload-user
      </button>
    </div>
  )
}

describe('useAuthBootstrap integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    clearAuthRecoveryHints()
    onlineManager.setOnline(true)
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

  it('clears auth and media uploads during double 401 when cached identity exists', async () => {
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

    expect(screen.getByText('guest')).toBeInTheDocument()
    expect(screen.queryByText('loading')).not.toBeInTheDocument()
    expect(clearMediaUploadQueue).toHaveBeenCalledOnce()
  })

  it('hydrates authenticated state from a full cached user when already offline', async () => {
    onlineManager.setOnline(false)
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(cachedUser.id))
    writeCachedAuthUser(cachedUser)

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:cached@example.com')).toBeInTheDocument()
    })

    expect(screen.getByText('cache-session')).toBeInTheDocument()
    expect(mockedCsrf).not.toHaveBeenCalled()
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('hydrates authenticated state from the id-only fallback when already offline', async () => {
    onlineManager.setOnline(false)
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, '7')

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:')).toBeInTheDocument()
    })

    expect(screen.getByText('cache-session')).toBeInTheDocument()
  })

  it('hydrates authenticated state from persisted pet cache hint when offline without local auth', async () => {
    onlineManager.setOnline(false)
    vi.mocked(hasPersistedAuthenticatedQueryCache).mockResolvedValueOnce(true)

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:')).toBeInTheDocument()
    })

    expect(screen.getByText('cache-session')).toBeInTheDocument()
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('uses cached auth immediately for a transient online startup failure', async () => {
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(cachedUser.id))
    writeCachedAuthUser(cachedUser)
    mockedCsrf.mockRejectedValueOnce({ isAxiosError: true, request: {} })

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:cached@example.com')).toBeInTheDocument()
    })

    expect(screen.getByText('cache-session')).toBeInTheDocument()
    expect(mockedApiGet).not.toHaveBeenCalled()
  })

  it('promotes a cache session to a server session after revalidation succeeds', async () => {
    onlineManager.setOnline(false)
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(cachedUser.id))
    writeCachedAuthUser(cachedUser)

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('cache-session')).toBeInTheDocument()
    })

    onlineManager.setOnline(true)
    mockedApiGet.mockResolvedValueOnce({ ...cachedUser, email: 'fresh@example.com' })
    screen.getByRole('button', { name: 'reload-user' }).click()

    await waitFor(() => {
      expect(screen.getByText('user:fresh@example.com')).toBeInTheDocument()
    })

    expect(screen.getByText('server-session')).toBeInTheDocument()
    expect(readCachedAuthUser()?.email).toBe('fresh@example.com')
  })

  it('clears a cache session and media uploads when reconnect revalidation confirms 401', async () => {
    onlineManager.setOnline(false)
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(cachedUser.id))
    writeCachedAuthUser(cachedUser)

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('cache-session')).toBeInTheDocument()
    })

    onlineManager.setOnline(true)
    mockedApiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
    screen.getByRole('button', { name: 'reload-user' }).click()

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument()
    })

    expect(readCachedAuthUser()).toBeNull()
    expect(window.localStorage.getItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY)).toBeNull()
    expect(clearMediaUploadQueue).toHaveBeenCalledOnce()
  })

  it('cancels recovery retries when a cached session is confirmed unauthenticated', async () => {
    window.localStorage.setItem(ACTIVE_AUTH_USER_ID_STORAGE_KEY, String(cachedUser.id))
    writeCachedAuthUser(cachedUser)
    mockedCsrf.mockRejectedValueOnce({ isAxiosError: true, request: {} })

    render(
      <AuthProvider>
        <AuthStatus />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('user:cached@example.com')).toBeInTheDocument()
    })

    mockedApiGet
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })

    screen.getByRole('button', { name: 'reload-user' }).click()

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument()
    })

    expect(mockedApiGet).toHaveBeenCalledTimes(2)

    await new Promise((resolve) => window.setTimeout(resolve, 1200))

    expect(mockedApiGet).toHaveBeenCalledTimes(2)
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
