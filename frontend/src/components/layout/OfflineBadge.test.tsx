import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import type { SyncSnapshot } from '@/lib/sync-snapshot'

const mockUseNetworkStatus = vi.fn()
vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}))

const mockSnapshot: SyncSnapshot = {
  pendingOperations: 0,
  queuedUploads: 0,
  syncingOperations: 0,
  uploadingUploads: 0,
  failedOperations: 0,
  conflictedOperations: 0,
  failedUploads: 0,
  activeTotal: 0,
  issueTotal: 0,
  hasActiveWork: false,
  hasIssues: false,
  isDrained: true,
}

const mockUseSyncSnapshot = vi.fn(() => mockSnapshot)
vi.mock('@/hooks/use-sync-snapshot', () => ({
  useSyncSnapshot: () => mockUseSyncSnapshot(),
}))

import { OfflineBadge } from './OfflineBadge'

function renderBadge() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <OfflineBadge />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

function setSnapshot(patch: Partial<SyncSnapshot>) {
  Object.assign(mockSnapshot, patch)
  mockUseSyncSnapshot.mockReturnValue({ ...mockSnapshot })
}

describe('OfflineBadge', () => {
  beforeEach(() => {
    mockUseNetworkStatus.mockReset()
    mockUseSyncSnapshot.mockReset()
    Object.assign(mockSnapshot, {
      pendingOperations: 0,
      queuedUploads: 0,
      syncingOperations: 0,
      uploadingUploads: 0,
      failedOperations: 0,
      conflictedOperations: 0,
      failedUploads: 0,
      activeTotal: 0,
      issueTotal: 0,
      hasActiveWork: false,
      hasIssues: false,
      isDrained: true,
    })
    mockUseSyncSnapshot.mockReturnValue(mockSnapshot)
  })

  it('renders badge when offline', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    const { container } = renderBadge()
    expect(container.firstChild).not.toBeNull()
    const offlineBadge = screen.getByTestId('offline-badge')
    expect(offlineBadge).toBeInTheDocument()
    expect(offlineBadge).toHaveAttribute('href', '/settings/sync')
  })

  it('renders nothing when online and no pending work or sync issues', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    const { container } = renderBadge()
    expect(container.firstChild).toBeNull()
  })

  it('renders syncing state while online with pending work', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    setSnapshot({ activeTotal: 2, hasActiveWork: true, isDrained: false })

    renderBadge()

    const syncingBadge = screen.getByTestId('offline-badge')
    expect(screen.getByText(/sync/i)).toBeInTheDocument()
    expect(syncingBadge).toHaveAttribute('href', '/settings/sync')
  })

  it('shows pending count when offline with queued uploads and no mutations', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    setSnapshot({ activeTotal: 1, hasActiveWork: true, queuedUploads: 1, isDrained: false })

    renderBadge()

    expect(screen.getByText(/1/i)).toBeInTheDocument()
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('shows failed badge linking to sync center', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    setSnapshot({
      failedOperations: 2,
      failedUploads: 1,
      issueTotal: 3,
      hasIssues: true,
    })

    renderBadge()

    const failedBadge = screen.getByTestId('offline-badge-failed')
    expect(failedBadge).toHaveTextContent('3')
    expect(failedBadge).toHaveAttribute('href', '/settings/sync')
  })

  it('shows failed pet operations as sync issues', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    setSnapshot({
      failedOperations: 1,
      issueTotal: 1,
      hasIssues: true,
    })

    renderBadge()

    const failedBadge = screen.getByTestId('offline-badge-failed')
    expect(failedBadge).toHaveTextContent('1')
    expect(failedBadge).toHaveAttribute('href', '/settings/sync')
  })

  it('shows conflicted badge linking to sync center', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    setSnapshot({
      conflictedOperations: 2,
      issueTotal: 2,
      hasIssues: true,
    })

    renderBadge()

    const conflictedBadge = screen.getByTestId('offline-badge-conflicted')
    expect(conflictedBadge).toHaveTextContent('2')
    expect(conflictedBadge).toHaveAttribute('href', '/settings/sync')
  })
})
