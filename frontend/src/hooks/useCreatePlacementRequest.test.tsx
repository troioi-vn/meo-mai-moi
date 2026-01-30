import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock toast before importing the hook so the hook sees the mocked functions
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { useCreatePlacementRequest } from './useCreatePlacementRequest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import { toast } from 'sonner'

describe('useCreatePlacementRequest', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    server.resetHandlers()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  describe('success', () => {
    it('calls toast.success and invalidates queries', async () => {
      const mockResponse = {
        id: 1,
        pet_id: 123,
        request_type: 'adoption',
        notes: 'Test request',
      }

      server.use(
        http.post('http://localhost:3000/api/placement-requests', () => {
          return HttpResponse.json({ data: mockResponse })
        })
      )

      const { result } = renderHook(() => useCreatePlacementRequest(), { wrapper })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      await act(async () => {
        await result.current.mutateAsync({
          pet_id: 123,
          request_type: 'adoption',
          notes: 'Test request',
        })
      })

      expect(toast.success).toHaveBeenCalledWith('Placement request created successfully!')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['pet', '123'],
      })
    })
  })

  describe('409 error', () => {
    it('calls toast.error with special 409 message', async () => {
      server.use(
        http.post('http://localhost:3000/api/placement-requests', () => {
          return HttpResponse.json({ message: 'Conflict error' }, { status: 409 })
        })
      )

      const { result } = renderHook(() => useCreatePlacementRequest(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            pet_id: 123,
            request_type: 'adoption',
          })
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith(
        'An active placement request of this type already exists for this pet.'
      )
    })
  })

  describe('non-409 error', () => {
    it('calls toast.error with backend message', async () => {
      server.use(
        http.post('http://localhost:3000/api/placement-requests', () => {
          return HttpResponse.json({ message: 'Backend validation error' }, { status: 422 })
        })
      )

      const { result } = renderHook(() => useCreatePlacementRequest(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            pet_id: 123,
            request_type: 'adoption',
          })
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith('Backend validation error')
    })

    it('falls back to default message when no backend message', async () => {
      server.use(
        http.post('http://localhost:3000/api/placement-requests', () => {
          return HttpResponse.json({}, { status: 500 })
        })
      )

      const { result } = renderHook(() => useCreatePlacementRequest(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({
            pet_id: 123,
            request_type: 'adoption',
          })
        } catch {
          // Expected to throw
        }
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to create placement request.')
    })
  })
})
