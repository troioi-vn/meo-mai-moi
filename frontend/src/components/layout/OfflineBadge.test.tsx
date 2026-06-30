import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
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

import { OfflineBadge } from './OfflineBadge'

function renderBadge() {
  return render(
    <I18nextProvider i18n={i18n}>
      <OfflineBadge />
    </I18nextProvider>
  )
}

describe('OfflineBadge', () => {
  beforeEach(() => {
    mockUseNetworkStatus.mockReset()
    mockUseUnifiedPendingCount.mockReset()
    mockUseOfflineOperationIssues.mockReset()
    mockUseUnifiedPendingCount.mockReturnValue(0)
    mockUseOfflineOperationIssues.mockReturnValue([])
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
