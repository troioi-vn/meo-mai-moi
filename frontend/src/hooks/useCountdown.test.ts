import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats the initial remaining time', () => {
    const { result } = renderHook(() => useCountdown('2026-04-09T12:01:05Z'))

    expect(result.current.remainingSeconds).toBe(65)
    expect(result.current.formatted).toBe('01:05')
    expect(result.current.isExpired).toBe(false)
  })

  it('counts down and calls onExpired once when the timer reaches zero', () => {
    const onExpired = vi.fn()
    const { result } = renderHook(() => useCountdown('2026-04-09T12:00:02Z', onExpired))

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.remainingSeconds).toBe(1)
    expect(result.current.isExpired).toBe(false)
    expect(onExpired).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.formatted).toBe('00:00')
    expect(result.current.isExpired).toBe(true)
    expect(onExpired).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('expires immediately for past or invalid timestamps', () => {
    const onPastExpired = vi.fn()
    const { result: pastResult } = renderHook(() =>
      useCountdown('2026-04-09T11:59:59Z', onPastExpired)
    )

    expect(pastResult.current.remainingSeconds).toBe(0)
    expect(pastResult.current.formatted).toBe('00:00')
    expect(pastResult.current.isExpired).toBe(true)
    expect(onPastExpired).toHaveBeenCalledTimes(1)

    const onInvalidExpired = vi.fn()
    const { result: invalidResult } = renderHook(() => useCountdown('not-a-date', onInvalidExpired))

    expect(invalidResult.current.remainingSeconds).toBe(0)
    expect(invalidResult.current.formatted).toBe('00:00')
    expect(invalidResult.current.isExpired).toBe(true)
    expect(onInvalidExpired).toHaveBeenCalledTimes(1)
  })
})
