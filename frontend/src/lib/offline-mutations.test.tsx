import { describe, expect, it, vi, beforeEach } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import { isOfflineWriteNetworkError, markOfflineForWriteReplay } from './offline-mutations'

describe('offline-mutations', () => {
  beforeEach(() => {
    onlineManager.setOnline(true)
    vi.clearAllMocks()
  })

  it('detects network-only write failures as offline replay candidates', () => {
    const networkError = {
      isAxiosError: true,
      request: {},
      response: undefined,
      toJSON: () => ({}),
    }
    const validationError = {
      isAxiosError: true,
      request: {},
      response: { status: 422 },
      toJSON: () => ({}),
    }

    expect(isOfflineWriteNetworkError(networkError)).toBe(true)
    expect(isOfflineWriteNetworkError(validationError)).toBe(false)
    expect(isOfflineWriteNetworkError(new Error('nope'))).toBe(false)
  })

  it('marks React Query offline so replayable writes pause instead of surfacing immediately', () => {
    markOfflineForWriteReplay()

    expect(onlineManager.isOnline()).toBe(false)
  })

  it('markOfflineForWriteReplay updates useNetworkStatus subscribers', async () => {
    const { useNetworkStatus } = await import('@/hooks/use-network-status')
    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current).toBe(true)

    act(() => {
      markOfflineForWriteReplay()
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
    expect(onlineManager.isOnline()).toBe(false)
  })
})
