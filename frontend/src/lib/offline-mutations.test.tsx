import { describe, expect, it, vi, beforeEach } from 'vite-plus/test'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mockUsePostPets = vi.fn()
const mockUsePutPetsId = vi.fn()
const mockUseDeletePetsId = vi.fn()
const mockUsePutPetsIdStatus = vi.fn()
const mockPostPets = vi.fn()
const mockPutPetsId = vi.fn()
const mockDeletePetsId = vi.fn()
const mockPutPetsIdStatus = vi.fn()

vi.mock('@/api/generated/pets/pets', () => ({
  usePostPets: (options?: unknown) => mockUsePostPets(options),
  usePutPetsId: (options?: unknown) => mockUsePutPetsId(options),
  useDeletePetsId: (options?: unknown) => mockUseDeletePetsId(options),
  usePutPetsIdStatus: (options?: unknown) => mockUsePutPetsIdStatus(options),
  postPets: (data: unknown) => mockPostPets(data),
  putPetsId: (id: number, data: unknown) => mockPutPetsId(id, data),
  deletePetsId: (id: number) => mockDeletePetsId(id),
  putPetsIdStatus: (id: number, data: unknown) => mockPutPetsIdStatus(id, data),
}))

import {
  OFFLINE_PET_MUTATION_KEYS,
  resumeOfflinePetMutations,
  setupMutationDefaults,
  useOfflineDeletePetsId,
  useOfflinePostPets,
  useOfflinePutPetsId,
  useOfflinePutPetsIdStatus,
} from './offline-mutations'

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  Wrapper.displayName = 'OfflineMutationsWrapper'

  return Wrapper
}

describe('offline-mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePostPets.mockReturnValue({ ok: true })
    mockUsePutPetsId.mockReturnValue({ ok: true })
    mockUseDeletePetsId.mockReturnValue({ ok: true })
    mockUsePutPetsIdStatus.mockReturnValue({ ok: true })
    mockPostPets.mockResolvedValue(undefined)
  })

  it('injects stable mutation keys into offline wrapper hooks', () => {
    const queryClient = new QueryClient()
    const wrapper = createWrapper(queryClient)

    renderHook(() => useOfflinePostPets(), { wrapper })
    renderHook(() => useOfflinePutPetsId(), { wrapper })
    renderHook(() => useOfflineDeletePetsId(), { wrapper })
    renderHook(() => useOfflinePutPetsIdStatus(), { wrapper })

    expect(mockUsePostPets).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({ mutationKey: [...OFFLINE_PET_MUTATION_KEYS.postPets] }),
      })
    )
    expect(mockUsePutPetsId).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsId],
        }),
      })
    )
    expect(mockUseDeletePetsId).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          mutationKey: [...OFFLINE_PET_MUTATION_KEYS.deletePetsId],
        }),
      })
    )
    expect(mockUsePutPetsIdStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        mutation: expect.objectContaining({
          mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus],
        }),
      })
    )
  })

  it('registers mutation defaults used for resumed offline mutations', async () => {
    const queryClient = new QueryClient()
    setupMutationDefaults(queryClient)
    const defaults = queryClient.getMutationDefaults(OFFLINE_PET_MUTATION_KEYS.postPets)

    await expect(
      defaults.mutationFn?.({ data: { name: 'Mochi' } }, {} as never)
    ).resolves.toBeUndefined()

    expect(mockPostPets).toHaveBeenCalledWith({ name: 'Mochi' })
  })

  it('continues persisted pending offline pet mutations even when they are not paused', async () => {
    const continueMutation = vi.fn().mockResolvedValue(undefined)
    const skipPaused = vi.fn().mockResolvedValue(undefined)
    const skipOtherKey = vi.fn().mockResolvedValue(undefined)
    const skipSuccess = vi.fn().mockResolvedValue(undefined)

    const queryClient = {
      getMutationCache: () => ({
        getAll: () => [
          {
            options: { mutationKey: [...OFFLINE_PET_MUTATION_KEYS.postPets] },
            state: { status: 'pending' },
            continue: continueMutation,
          },
          {
            options: { mutationKey: ['somethingElse'] },
            state: { status: 'pending' },
            continue: skipOtherKey,
          },
          {
            options: { mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsId] },
            state: { status: 'success' },
            continue: skipSuccess,
          },
          {
            options: {},
            state: { status: 'pending' },
            continue: skipPaused,
          },
        ],
      }),
    } as unknown as QueryClient

    await resumeOfflinePetMutations(queryClient)

    expect(continueMutation).toHaveBeenCalledTimes(1)
    expect(skipOtherKey).not.toHaveBeenCalled()
    expect(skipSuccess).not.toHaveBeenCalled()
    expect(skipPaused).not.toHaveBeenCalled()
  })
})
