import { describe, expect, it } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePendingMutationsCount } from './use-pending-mutations'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe('usePendingMutationsCount', () => {
  it('tracks pending mutations as they start and finish', async () => {
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

    const { result } = renderHook(() => usePendingMutationsCount(), { wrapper })

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
      expect(result.current).toBe(1)
    })

    act(() => {
      task.resolve(undefined)
    })

    await waitFor(() => {
      expect(result.current).toBe(0)
    })
  })
})
