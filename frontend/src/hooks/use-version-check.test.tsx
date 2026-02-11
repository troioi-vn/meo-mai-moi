import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { toast } from 'sonner'

vi.mock('@/api/axios', () => ({
  setVersionMismatchHandler: vi.fn(),
}))

import { useVersionCheck } from './use-version-check'
import { setVersionMismatchHandler } from '@/api/axios'

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers and unregisters the mismatch handler', () => {
    const { unmount } = renderHook(() => useVersionCheck())

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(expect.any(Function))

    unmount()

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(null)
  })

  it('shows a persistent toast when version mismatch fires', () => {
    renderHook(() => useVersionCheck())

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0][0] as () => void

    act(() => {
      handler()
    })

    expect(toast).toHaveBeenCalledWith(
      'New version available!',
      expect.objectContaining({
        duration: Infinity,
        action: expect.objectContaining({ label: 'Reload' }),
        cancel: expect.objectContaining({ label: 'Later' }),
      })
    )
  })

  it('does not show duplicate toast while one is visible', () => {
    renderHook(() => useVersionCheck())

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0][0] as () => void

    act(() => {
      handler()
      handler()
      handler()
    })

    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('snoozes for 30 minutes after clicking Later, then reappears', () => {
    renderHook(() => useVersionCheck())

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0][0] as () => void

    // Show the toast
    act(() => {
      handler()
    })
    expect(toast).toHaveBeenCalledTimes(1)

    // Click "Later" (the cancel onClick)
    const cancelOnClick = vi.mocked(toast).mock.calls[0][1].cancel.onClick as () => void
    act(() => {
      cancelOnClick()
    })

    // Fire again immediately — should be suppressed (within snooze window)
    act(() => {
      handler()
    })
    expect(toast).toHaveBeenCalledTimes(1)

    // Advance past the 30-minute snooze
    vi.advanceTimersByTime(30 * 60 * 1000 + 1)

    // Fire again — snooze expired, toast should reappear
    act(() => {
      handler()
    })
    expect(toast).toHaveBeenCalledTimes(2)
  })
})
