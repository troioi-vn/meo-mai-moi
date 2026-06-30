import { onlineManager } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { enqueueUpload, resetMediaUploadQueueForTests } from '@/lib/media-upload-queue'
import { useUnifiedPendingCount } from './use-unified-pending-count'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

const makeFile = (name = 'photo.jpg') => new File(['photo'], name, { type: 'image/jpeg' })

describe('useUnifiedPendingCount', () => {
  beforeEach(async () => {
    onlineManager.setOnline(false)
    await resetMediaUploadQueueForTests()
  })

  it('counts queued uploads when there are no pending mutations', async () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useUnifiedPendingCount(), { wrapper })

    expect(result.current).toBe(0)

    await act(async () => {
      await enqueueUpload({
        target: { kind: 'pet-photo', petId: 1 },
        file: makeFile(),
      })
    })

    await waitFor(() => {
      expect(result.current).toBe(1)
    })
  })

  it('combines pending mutations and queued uploads', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
          gcTime: Infinity,
        },
      },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const task = deferred<undefined>()

    const { result } = renderHook(() => useUnifiedPendingCount(), { wrapper })

    await act(async () => {
      await enqueueUpload({
        target: { kind: 'pet-photo', petId: 1 },
        file: makeFile(),
      })
    })

    act(() => {
      void queryClient
        .getMutationCache()
        .build(queryClient, {
          mutationKey: ['savePet'],
          mutationFn: async () => task.promise,
        })
        .execute(undefined)
    })

    await waitFor(() => {
      expect(result.current).toBe(2)
    })
  })
})
