import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import i18n from '@/i18n'

const mockUseNetworkStatus = vi.fn()
vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}))
const mockUseUnifiedPendingCount = vi.fn()
vi.mock('@/hooks/use-unified-pending-count', () => ({
  useUnifiedPendingCount: () => mockUseUnifiedPendingCount(),
}))
const mockUseOfflineOperationIssues = vi.fn()
vi.mock('@/hooks/use-offline-operation-issues', () => ({
  useOfflineOperationIssues: () => mockUseOfflineOperationIssues(),
}))

const mockRetryFailedOperation = vi.fn()
const mockDiscardOperation = vi.fn()
const mockReplayPendingOfflineOperations = vi.fn()
vi.mock('@/offline/operations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/offline/operations')>()
  return {
    ...actual,
    retryFailedOperation: (...args: Parameters<typeof actual.retryFailedOperation>) =>
      mockRetryFailedOperation(...args),
    discardOperation: (...args: Parameters<typeof actual.discardOperation>) =>
      mockDiscardOperation(...args),
  }
})
vi.mock('@/offline/sync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/offline/sync')>()
  return {
    ...actual,
    replayPendingOfflineOperations: (
      ...args: Parameters<typeof actual.replayPendingOfflineOperations>
    ) => mockReplayPendingOfflineOperations(...args),
  }
})

import { OfflineBadge } from './OfflineBadge'
import { OfflineSyncIssues } from './OfflineSyncIssues'

const failedIssue = {
  id: 'op-1',
  idempotencyKey: 'idem-1',
  entityType: 'weight' as const,
  entityId: 42,
  operation: 'create' as const,
  payload: { weight_kg: 4.5, record_date: '2024-01-01' },
  status: 'failed' as const,
  attempts: 2,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
  lastError: 'Network timeout',
}

const conflictedIssue = {
  ...failedIssue,
  id: 'op-2',
  idempotencyKey: 'idem-2',
  status: 'conflicted' as const,
  lastError: 'Version mismatch',
}

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
    </QueryClientProvider>
  )
}

function renderBadge() {
  return renderWithProviders(<OfflineBadge />)
}

describe('OfflineBadge', () => {
  beforeEach(() => {
    mockUseNetworkStatus.mockReset()
    mockUseUnifiedPendingCount.mockReset()
    mockUseOfflineOperationIssues.mockReset()
    mockRetryFailedOperation.mockReset()
    mockDiscardOperation.mockReset()
    mockReplayPendingOfflineOperations.mockReset()
    mockUseUnifiedPendingCount.mockReturnValue(0)
    mockUseOfflineOperationIssues.mockReturnValue([])
    mockRetryFailedOperation.mockResolvedValue({ ...failedIssue, status: 'pending' })
    mockDiscardOperation.mockResolvedValue(true)
    mockReplayPendingOfflineOperations.mockResolvedValue(undefined)
  })

  it('renders badge when offline', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    const { container } = renderBadge()
    expect(container.firstChild).not.toBeNull()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('renders nothing when online and no pending work or sync issues', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    const { container } = renderBadge()
    expect(container.firstChild).toBeNull()
  })

  it('renders syncing state while online with pending work', () => {
    mockUseNetworkStatus.mockReturnValue(true)
    mockUseUnifiedPendingCount.mockReturnValue(2)

    renderBadge()

    expect(screen.getByText(/sync/i)).toBeInTheDocument()
  })

  it('shows pending count when offline with queued uploads and no mutations', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    mockUseUnifiedPendingCount.mockReturnValue(1)

    renderBadge()

    expect(screen.getByText(/1/i)).toBeInTheDocument()
    expect(screen.getByText(/pending/i)).toBeInTheDocument()
  })

  it('shows sync issues entry point when failed operations exist', async () => {
    mockUseNetworkStatus.mockReturnValue(true)
    mockUseUnifiedPendingCount.mockReturnValue(1)
    mockUseOfflineOperationIssues.mockReturnValue([
      {
        id: 'op-1',
        idempotencyKey: 'idem-1',
        entityType: 'weight',
        entityId: 42,
        operation: 'create',
        payload: { grams: 4500 },
        status: 'failed',
        attempts: 2,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_100_000,
        lastError: 'Network timeout',
      },
    ])

    const user = userEvent.setup()
    renderBadge()

    const trigger = screen.getByTestId('offline-sync-issues-trigger')
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('1')

    await user.click(trigger)

    const panel = await screen.findByTestId('offline-sync-issues-panel')
    expect(panel).toBeInTheDocument()

    const issueItem = screen.getByTestId('offline-sync-issue-item')
    expect(issueItem).toHaveTextContent(/weight/i)
    expect(issueItem).toHaveTextContent(/create/i)
    expect(issueItem).toHaveTextContent('Network timeout')
    expect(issueItem).toHaveTextContent(/failed/i)
  })

  it('hides sync issues entry point when there are no failed or conflicted operations', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    mockUseUnifiedPendingCount.mockReturnValue(1)
    mockUseOfflineOperationIssues.mockReturnValue([])

    renderBadge()

    expect(screen.queryByTestId('offline-sync-issues-trigger')).not.toBeInTheDocument()
  })
})

describe('OfflineSyncIssues recovery actions', () => {
  beforeEach(() => {
    mockUseNetworkStatus.mockReturnValue(true)
    mockRetryFailedOperation.mockReset()
    mockDiscardOperation.mockReset()
    mockReplayPendingOfflineOperations.mockReset()
    mockRetryFailedOperation.mockResolvedValue({ ...failedIssue, status: 'pending' })
    mockDiscardOperation.mockResolvedValue(true)
    mockReplayPendingOfflineOperations.mockResolvedValue(undefined)
  })

  it('retries failed issues and triggers replay when online', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OfflineSyncIssues issues={[failedIssue]} />)

    await user.click(screen.getByTestId('offline-sync-issues-trigger'))
    await user.click(screen.getByTestId('offline-sync-issue-retry'))

    await waitFor(() => {
      expect(mockRetryFailedOperation).toHaveBeenCalledWith('op-1')
      expect(mockReplayPendingOfflineOperations).toHaveBeenCalled()
    })
  })

  it('does not show retry for conflicted issues', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OfflineSyncIssues issues={[conflictedIssue]} />)

    await user.click(screen.getByTestId('offline-sync-issues-trigger'))

    expect(screen.queryByTestId('offline-sync-issue-retry')).not.toBeInTheDocument()
    expect(screen.getByTestId('offline-sync-issue-discard')).toBeInTheDocument()
  })

  it('discards failed and conflicted issues', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OfflineSyncIssues issues={[failedIssue]} />)

    await user.click(screen.getByTestId('offline-sync-issues-trigger'))
    await user.click(screen.getByTestId('offline-sync-issue-discard'))

    await waitFor(() => {
      expect(mockDiscardOperation).toHaveBeenCalledWith('op-1')
    })
  })
})
