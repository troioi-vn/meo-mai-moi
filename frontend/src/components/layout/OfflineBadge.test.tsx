import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
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
    mockUseUnifiedPendingCount.mockReturnValue(0)
  })

  it('renders badge when offline', () => {
    mockUseNetworkStatus.mockReturnValue(false)
    const { container } = renderBadge()
    expect(container.firstChild).not.toBeNull()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('renders nothing when online and no pending work', () => {
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
})
