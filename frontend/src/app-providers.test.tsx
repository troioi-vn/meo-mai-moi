import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/hooks/use-auth'
import { persistOptions, queryClient } from '@/lib/query-cache'
import { mockUser } from '@/testing/mocks/data/user'

const mockStore = vi.hoisted(() => new Map<string, unknown>())
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => mockStore),
  entries: vi.fn((store: Map<string, unknown> = mockStore) =>
    Promise.resolve(Array.from(store.entries()))
  ),
  clear: vi.fn((store: Map<string, unknown> = mockStore) => {
    store.clear()
    return Promise.resolve()
  }),
  get: vi.fn((key: string, store: Map<string, unknown> = mockStore) =>
    Promise.resolve(store.get(key))
  ),
  set: vi.fn((key: string, value: unknown, store: Map<string, unknown> = mockStore) => {
    store.set(key, value)
    return Promise.resolve()
  }),
  del: vi.fn((key: string, store: Map<string, unknown> = mockStore) => {
    store.delete(key)
    return Promise.resolve()
  }),
}))

vi.mock('@/api/axios', () => ({
  api: { get: vi.fn() },
  authApi: { post: vi.fn().mockResolvedValue({}) },
  csrf: vi.fn().mockResolvedValue(undefined),
  setUnauthorizedHandler: vi.fn(),
  SKIP_UNAUTHORIZED_REDIRECT_HEADER: 'X-Skip-Unauthorized-Redirect',
}))

vi.mock('@/lib/media-upload-queue', () => ({
  clearMediaUploadQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/pwa', () => ({
  isStandalonePwa: vi.fn().mockReturnValue(false),
}))

function PrivatePage() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return <div>Loading...</div>
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <div data-testid="private-page">Private</div>
}

function ProductionProviderStack({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider initialUser={mockUser} initialLoading={false} skipInitialLoad>
        {children}
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}

describe('production provider order', () => {
  beforeEach(() => {
    mockStore.clear()
    queryClient.clear()
  })

  it('renders an authenticated private route with PersistQueryClientProvider outside AuthProvider', async () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <ProductionProviderStack>
          <Routes>
            <Route path="/private" element={<PrivatePage />} />
          </Routes>
        </ProductionProviderStack>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('private-page')).toBeInTheDocument()
  })
})
