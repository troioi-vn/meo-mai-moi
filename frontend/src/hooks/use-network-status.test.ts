import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'

describe('useNetworkStatus', () => {
  describe('initial snapshot', () => {
    beforeEach(() => {
      vi.resetModules()
    })

    it('returns true when online', async () => {
      const { onlineManager } = await import('@tanstack/react-query')
      vi.spyOn(onlineManager, 'isOnline').mockReturnValue(true)

      const { useNetworkStatus } = await import('./use-network-status')
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current).toBe(true)
    })

    it('returns false when offline', async () => {
      const { onlineManager } = await import('@tanstack/react-query')
      vi.spyOn(onlineManager, 'isOnline').mockReturnValue(false)

      const { useNetworkStatus } = await import('./use-network-status')
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current).toBe(false)
    })
  })

  describe('onlineManager subscription (regression guard)', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
      onlineManager.setOnline(true)
    })

    afterEach(() => {
      onlineManager.setOnline(true)
    })

    it('re-renders when onlineManager.setOnline(false)', async () => {
      const { useNetworkStatus } = await import('./use-network-status')
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current).toBe(true)

      act(() => {
        onlineManager.setOnline(false)
      })

      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })

    it('re-renders when onlineManager.setOnline(true) after offline', async () => {
      onlineManager.setOnline(false)

      const { useNetworkStatus } = await import('./use-network-status')
      const { result } = renderHook(() => useNetworkStatus())

      expect(result.current).toBe(false)

      act(() => {
        onlineManager.setOnline(true)
      })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })
  })
})
