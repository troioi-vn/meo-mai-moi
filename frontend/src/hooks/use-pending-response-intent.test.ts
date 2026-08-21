import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vite-plus/test'
import { usePendingResponseIntent } from './use-pending-response-intent'

describe('usePendingResponseIntent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('round-trips an intent for the same request', () => {
    const { result } = renderHook(() => usePendingResponseIntent())

    act(() => {
      result.current.save({ requestId: 42, message: 'I can take her', phone: '+84901234567' })
    })

    expect(result.current.read(42)).toMatchObject({
      requestId: 42,
      message: 'I can take her',
      phone: '+84901234567',
    })
  })

  it('ignores an intent saved for a different request', () => {
    // Someone who bounced off one request and signed in from another must not
    // have their old message resurface on the wrong pet.
    const { result } = renderHook(() => usePendingResponseIntent())

    act(() => {
      result.current.save({ requestId: 42, message: 'hello', phone: '' })
    })

    expect(result.current.read(43)).toBeNull()
  })

  it('expires after thirty minutes', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => usePendingResponseIntent())

    act(() => {
      result.current.save({ requestId: 1, message: 'hello', phone: '' })
    })
    expect(result.current.read(1)).not.toBeNull()

    vi.advanceTimersByTime(31 * 60 * 1000)
    expect(result.current.read(1)).toBeNull()
  })

  it('clears on demand', () => {
    const { result } = renderHook(() => usePendingResponseIntent())

    act(() => {
      result.current.save({ requestId: 1, message: 'hello', phone: '' })
      result.current.clear()
    })

    expect(result.current.read(1)).toBeNull()
  })

  it('survives unreadable storage', () => {
    // Private windows and blocked site data throw on access rather than
    // returning null, so every accessor is wrapped.
    localStorage.setItem('meo:pending-placement-response', 'not json')
    const { result } = renderHook(() => usePendingResponseIntent())

    expect(result.current.read(1)).toBeNull()
  })

  it('rejects a stored value missing its fields', () => {
    localStorage.setItem('meo:pending-placement-response', JSON.stringify({ message: 'orphan' }))
    const { result } = renderHook(() => usePendingResponseIntent())

    expect(result.current.read(1)).toBeNull()
  })
})
