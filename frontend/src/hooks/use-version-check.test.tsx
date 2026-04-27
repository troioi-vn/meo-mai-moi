import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vite-plus/test'
import { toast } from 'sonner'

vi.mock('@/api/axios', () => ({
  setVersionMismatchHandler: vi.fn(),
}))

import { useVersionCheck } from './use-version-check'
import { setVersionMismatchHandler } from '@/api/axios'
import type { Action } from 'sonner'

const createToastClickEvent = () =>
  new MouseEvent('click') as unknown as React.MouseEvent<HTMLButtonElement>

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers and unregisters the mismatch handler', () => {
    const { unmount } = renderHook(() => {
      useVersionCheck()
    })

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(expect.any(Function))

    unmount()

    expect(setVersionMismatchHandler).toHaveBeenCalledWith(null)
  })

  it('shows a persistent toast when version mismatch fires', () => {
    renderHook(() => {
      useVersionCheck()
    })

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0]?.[0]
    expect(handler).toBeTypeOf('function')
    if (typeof handler !== 'function') throw new Error('Version mismatch handler not registered')

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
    renderHook(() => {
      useVersionCheck()
    })

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0]?.[0]
    expect(handler).toBeTypeOf('function')
    if (typeof handler !== 'function') throw new Error('Version mismatch handler not registered')

    act(() => {
      handler()
      handler()
      handler()
    })

    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('snoozes for 30 minutes after clicking Later, then reappears', () => {
    renderHook(() => {
      useVersionCheck()
    })

    const handler = vi.mocked(setVersionMismatchHandler).mock.calls[0]?.[0]
    expect(handler).toBeTypeOf('function')
    if (typeof handler !== 'function') throw new Error('Version mismatch handler not registered')

    // Show the toast
    act(() => {
      handler()
    })
    expect(toast).toHaveBeenCalledTimes(1)

    // Click "Later" (the cancel onClick)
    const toastCall = vi.mocked(toast).mock.calls[0]
    expect(toastCall).toBeDefined()
    if (!toastCall) throw new Error('Toast call not found')
    const options = toastCall[1]
    if (!options || typeof options !== 'object') throw new Error('Toast options not found')
    const cancel = options.cancel as Action | undefined
    if (!cancel?.onClick) throw new Error('Cancel action missing')
    act(() => {
      cancel.onClick(createToastClickEvent())
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
