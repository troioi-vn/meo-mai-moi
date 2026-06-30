import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockResumeOfflinePetMutations = vi.fn()
const mockProcessQueue = vi.fn()
const mockReplayPendingOfflineOperations = vi.fn()
const mockGetPendingUploadCountSnapshot = vi.fn(() => 0)
const mockGetPendingOperationCountSnapshot = vi.fn(() => 0)
const mockInitializeOperationsStore = vi.fn()

vi.mock('@/lib/offline-mutations', () => ({
  OFFLINE_PET_MUTATION_KEYS: {
    postPets: ['postPets'],
    putPetsId: ['putPetsId'],
    deletePetsId: ['deletePetsId'],
    putPetsIdStatus: ['putPetsIdStatus'],
  },
  resumeOfflinePetMutations: (...args: unknown[]) => mockResumeOfflinePetMutations(...args),
}))

vi.mock('@/lib/media-upload-queue', () => ({
  getPendingUploadCountSnapshot: () => mockGetPendingUploadCountSnapshot(),
  processQueue: (...args: unknown[]) => mockProcessQueue(...args),
  promoteNextPendingPetPhoto: vi.fn(),
}))

vi.mock('@/offline/operations', () => ({
  getPendingOperationCountSnapshot: () => mockGetPendingOperationCountSnapshot(),
  initializeOperationsStore: () => mockInitializeOperationsStore(),
}))

vi.mock('@/lib/i18n-toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/offline/sync', () => ({
  replayPendingOfflineOperations: (...args: unknown[]) =>
    mockReplayPendingOfflineOperations(...args),
}))

import { useSyncStatus } from './use-sync-status'

describe('useSyncStatus', () => {
  beforeEach(() => {
    onlineManager.setOnline(true)
    vi.clearAllMocks()
    mockGetPendingUploadCountSnapshot.mockReturnValue(0)
    mockGetPendingOperationCountSnapshot.mockReturnValue(0)
    mockInitializeOperationsStore.mockResolvedValue(undefined)
    mockResumeOfflinePetMutations.mockResolvedValue(undefined)
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
      expect(mockReplayPendingOfflineOperations).toHaveBeenCalledWith(queryClient)
    })

    expect(mockResumeOfflinePetMutations).toHaveBeenCalledWith(queryClient)
    expect(mockProcessQueue).toHaveBeenCalled()
  })

  it('blocks beforeunload when durable offline operations are still pending', () => {
    mockGetPendingOperationCountSnapshot.mockReturnValue(1)

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

  it('does not block beforeunload when uploads and operations are clear', () => {
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

    expect(preventDefault).not.toHaveBeenCalled()
  })
})
