import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import type { SyncTableRow } from '@/lib/sync-snapshot'

const mockRows: SyncTableRow[] = []
const mockSnapshot = {
  pendingOperations: 0,
  queuedUploads: 0,
  syncingOperations: 0,
  uploadingUploads: 0,
  failedOperations: 1,
  conflictedOperations: 0,
  failedUploads: 0,
  activeTotal: 0,
  issueTotal: 1,
  hasActiveWork: false,
  hasIssues: true,
  isDrained: true,
}

const mockRetryFailedOperation = vi.fn()
const mockDiscardOperation = vi.fn()
const mockRebaseConflictedOperation = vi.fn()
const mockAcceptServerConflictVersion = vi.fn()
const mockRetryUpload = vi.fn()
const mockRemoveUpload = vi.fn()
const mockReplayPendingOfflineOperations = vi.fn()

vi.mock('@/hooks/use-sync-snapshot', () => ({
  useSyncSnapshot: () => mockSnapshot,
  useSyncTableRows: () => mockRows,
}))

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => true,
}))

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

vi.mock('@/offline/conflicts', () => ({
  acceptServerConflictVersion: (...args: unknown[]) => mockAcceptServerConflictVersion(...args),
  rebaseConflictedOperation: (...args: unknown[]) => mockRebaseConflictedOperation(...args),
}))

vi.mock('@/lib/media-upload-queue', () => ({
  retryUpload: (...args: unknown[]) => mockRetryUpload(...args),
  removeUpload: (...args: unknown[]) => mockRemoveUpload(...args),
}))

vi.mock('@/offline/sync', () => ({
  replayPendingOfflineOperations: (...args: unknown[]) =>
    mockReplayPendingOfflineOperations(...args),
}))

import SyncSettingsPage from './SyncSettingsPage'

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <SyncSettingsPage />
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

describe('SyncSettingsPage', () => {
  beforeEach(() => {
    mockRows.length = 0
    mockRetryFailedOperation.mockReset()
    mockDiscardOperation.mockReset()
    mockRebaseConflictedOperation.mockReset()
    mockAcceptServerConflictVersion.mockReset()
    mockRetryUpload.mockReset()
    mockRemoveUpload.mockReset()
    mockReplayPendingOfflineOperations.mockReset()
    mockRetryFailedOperation.mockResolvedValue({ status: 'pending' })
    mockDiscardOperation.mockResolvedValue(true)
    mockRebaseConflictedOperation.mockResolvedValue({ status: 'pending' })
    mockAcceptServerConflictVersion.mockResolvedValue(true)
    mockReplayPendingOfflineOperations.mockResolvedValue(undefined)
  })

  it('renders empty state when there is no sync work', () => {
    renderPage()
    expect(screen.getByText(/everything is synced/i)).toBeInTheDocument()
  })

  it('retries and discards failed offline operations from the table', async () => {
    mockRows.push({
      id: 'operation-op-1',
      kind: 'operation',
      domain: 'weight',
      operation: 'create',
      status: 'failed',
      attempts: 2,
      lastError: 'Server unavailable',
      createdAt: 1,
      updatedAt: 2,
      referenceId: 'idem-1',
      actionTargetId: 'op-1',
      canRetry: true,
      canDiscard: true,
      canKeepMine: false,
      canUseServer: false,
    })

    const user = userEvent.setup()
    renderPage()

    expect(screen.getByTestId('sync-table-row')).toBeInTheDocument()

    await user.click(screen.getByTestId('sync-row-retry-operation-op-1'))

    await waitFor(() => {
      expect(mockRetryFailedOperation).toHaveBeenCalledWith('op-1')
      expect(mockReplayPendingOfflineOperations).toHaveBeenCalled()
    })

    await user.click(screen.getByTestId('sync-row-discard-operation-op-1'))

    await waitFor(() => {
      expect(mockDiscardOperation).toHaveBeenCalledWith('op-1')
    })
  })

  it('resolves conflicted weight updates from the sync center', async () => {
    mockRows.push({
      id: 'operation-op-conflict',
      kind: 'operation',
      domain: 'weight',
      operation: 'update',
      status: 'conflicted',
      attempts: 1,
      lastError: 'Version conflict',
      createdAt: 1,
      updatedAt: 2,
      referenceId: 'idem-conflict',
      actionTargetId: 'op-conflict',
      canRetry: false,
      canDiscard: true,
      canKeepMine: true,
      canUseServer: true,
      conflictLocalPreview: '{"weight_kg":5.5}',
      conflictServerPreview: '{"weight_kg":4.2}',
    })

    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('sync-row-keep-mine-operation-op-conflict'))

    await waitFor(() => {
      expect(mockRebaseConflictedOperation).toHaveBeenCalledWith('op-conflict')
      expect(mockReplayPendingOfflineOperations).toHaveBeenCalled()
    })

    await user.click(screen.getByTestId('sync-row-use-server-operation-op-conflict'))

    await waitFor(() => {
      expect(mockAcceptServerConflictVersion).toHaveBeenCalledWith(
        expect.any(Object),
        'op-conflict'
      )
    })
  })
})
