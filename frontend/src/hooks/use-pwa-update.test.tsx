import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock PWA functions (hoisted before importing the hook so the hook sees the mock)
vi.mock('@/pwa', () => ({
  setNeedsRefreshCallback: vi.fn(),
  triggerAppUpdate: vi.fn(),
}))

import { usePwaUpdate } from './use-pwa-update'
import { toast } from 'sonner'
import { setNeedsRefreshCallback, triggerAppUpdate } from '@/pwa'

describe('usePwaUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers and unregisters callback', () => {
    const { unmount } = renderHook(() => usePwaUpdate())

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(expect.any(Function))

    unmount()

    expect(setNeedsRefreshCallback).toHaveBeenCalledWith(null)
  })

  it('shows toast when callback fires and handles update action', async () => {
    const { result } = renderHook(() => usePwaUpdate())

    // Get the callback that was registered
    const callback = setNeedsRefreshCallback.mock.calls[0][0]

    // Simulate SW detecting update
    act(() => {
      callback()
    })

    // Wait for toast to be called
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('New version available! 🎉', {
        description: 'Click Update to get the latest features.',
        duration: Infinity,
        action: {
          label: 'Update',
          onClick: expect.any(Function),
        },
        cancel: {
          label: 'Later',
          onClick: expect.any(Function),
        },
      })
    })

    // Get the toast options
    const toastCall = vi.mocked(toast).mock.calls[0]
    const options = toastCall[1]

    // Simulate clicking Update
    act(() => {
      options.action.onClick()
    })

    expect(triggerAppUpdate).toHaveBeenCalled()

    // Simulate clicking Later
    act(() => {
      options.cancel.onClick()
    })

    expect(result.current.updateAvailable).toBe(false)
  })
})
