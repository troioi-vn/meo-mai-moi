import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockResumeOfflinePetMutations = vi.fn()
const mockProcessQueue = vi.fn()
const mockReplayPendingWeightCreates = vi.fn()

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
  getPendingUploadCountSnapshot: () => 0,
  processQueue: (...args: unknown[]) => mockProcessQueue(...args),
  promoteNextPendingPetPhoto: vi.fn(),
}))

vi.mock('@/lib/i18n-toast', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/offline/sync', () => ({
  replayPendingWeightCreates: (...args: unknown[]) => mockReplayPendingWeightCreates(...args),
}))

import { useSyncStatus } from './use-sync-status'

describe('useSyncStatus', () => {
  beforeEach(() => {
    onlineManager.setOnline(true)
    vi.clearAllMocks()
    mockResumeOfflinePetMutations.mockResolvedValue(undefined)
    mockProcessQueue.mockResolvedValue(undefined)
    mockReplayPendingWeightCreates.mockResolvedValue(undefined)
  })

  it('replays pending weight creates when connectivity returns', async () => {
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
      expect(mockReplayPendingWeightCreates).toHaveBeenCalledWith(queryClient)
    })

    expect(mockResumeOfflinePetMutations).toHaveBeenCalledWith(queryClient)
    expect(mockProcessQueue).toHaveBeenCalled()
  })
})
