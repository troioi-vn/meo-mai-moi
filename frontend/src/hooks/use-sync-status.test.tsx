import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockProcessQueue = vi.fn()
const mockReplayPendingOfflineOperations = vi.fn()
const mockBuildSyncSnapshot = vi.fn()
const mockInitializeOperationsStore = vi.fn()

let uploadListener: () => void = () => undefined
let operationListener: () => void = () => undefined

vi.mock('@/lib/media-upload-queue', () => ({
  processQueue: () => mockProcessQueue(),
  subscribe: (listener: () => void) => {
    uploadListener = listener
    return () => undefined
  },
}))

vi.mock('@/lib/sync-snapshot', () => ({
  buildSyncSnapshot: () => mockBuildSyncSnapshot(),
}))

vi.mock('@/offline/operations', () => ({
  initializeOperationsStore: () => mockInitializeOperationsStore(),
  subscribe: (listener: () => void) => {
    operationListener = listener
    return () => undefined
  },
}))

vi.mock('@/lib/i18n-toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/offline/sync', () => ({
  replayPendingOfflineOperations: () => mockReplayPendingOfflineOperations(),
}))

import { toast } from '@/lib/i18n-toast'
import { useSyncStatus } from './use-sync-status'

const drainedSnapshot = {
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

describe('useSyncStatus', () => {
  beforeEach(() => {
    onlineManager.setOnline(true)
    vi.clearAllMocks()
    uploadListener = () => undefined
    operationListener = () => undefined
    mockBuildSyncSnapshot.mockReturnValue(drainedSnapshot)
    mockInitializeOperationsStore.mockResolvedValue(undefined)
    mockProcessQueue.mockResolvedValue(undefined)
    mockReplayPendingOfflineOperations.mockResolvedValue(undefined)
  })

  it('initializes the durable operation store on mount', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(
      () => {
        useSyncStatus()
      },
      { wrapper }
    )

    await waitFor(() => {
      expect(mockInitializeOperationsStore).toHaveBeenCalled()
    })
  })

  it('replays pending offline operations when connectivity returns', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    onlineManager.setOnline(false)
    renderHook(
      () => {
        useSyncStatus()
      },
      { wrapper }
    )

    await act(async () => {
      onlineManager.setOnline(true)
    })

    await waitFor(() => {
      expect(mockReplayPendingOfflineOperations).toHaveBeenCalled()
    })

    expect(mockProcessQueue).toHaveBeenCalled()
  })

  it('blocks beforeunload when active sync work remains', () => {
    mockBuildSyncSnapshot.mockReturnValue({
      ...drainedSnapshot,
      activeTotal: 1,
      hasActiveWork: true,
      isDrained: false,
    })

    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(
      () => {
        useSyncStatus()
      },
      { wrapper }
    )

    const event = new Event('beforeunload') as BeforeUnloadEvent
    const preventDefault = vi.fn()
    Object.defineProperty(event, 'preventDefault', { value: preventDefault })

    window.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalled()
  })

  it('does not show sync complete while uploads or operations are still active', async () => {
    const activeSnapshot = {
      ...drainedSnapshot,
      activeTotal: 1,
      queuedUploads: 1,
      hasActiveWork: true,
      isDrained: false,
    }

    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    onlineManager.setOnline(false)
    renderHook(
      () => {
        useSyncStatus()
      },
      { wrapper }
    )

    mockBuildSyncSnapshot.mockReturnValue(activeSnapshot)

    await act(async () => {
      onlineManager.setOnline(true)
    })

    mockBuildSyncSnapshot.mockReturnValue(activeSnapshot)
    await act(async () => {
      uploadListener()
    })

    expect(toast.success).not.toHaveBeenCalled()

    mockBuildSyncSnapshot.mockReturnValue(drainedSnapshot)
    await act(async () => {
      operationListener()
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('common:status.syncComplete')
    })
  })
})
