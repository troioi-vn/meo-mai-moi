import { useCallback } from 'react'

const STORAGE_KEY = 'meo:pending-placement-response'
const TTL_MS = 30 * 60 * 1000

export interface PendingResponseIntent {
  requestId: number
  message: string
  phone: string
  savedAt: number
}

/**
 * Remembers that someone wanted to answer a placement request, across a trip
 * through sign-in.
 *
 * localStorage rather than sessionStorage on purpose: the Google round trip
 * leaves the origin entirely, and an email verification link often opens in a
 * different tab or a different browser. The short TTL and the requestId check
 * cover the staleness that buys.
 *
 * Every accessor is wrapped: private windows, cleared site data and browsers set
 * to block storage all throw rather than returning null.
 */
export function usePendingResponseIntent() {
  const save = useCallback((intent: Omit<PendingResponseIntent, 'savedAt'>) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...intent, savedAt: Date.now() } satisfies PendingResponseIntent)
      )
    } catch {
      // Losing the intent costs one extra tap, so failing quietly is right.
    }
  }, [])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  /** Returns the stored intent only when it is fresh and for this same request. */
  const read = useCallback((requestId: number): PendingResponseIntent | null => {
    let raw: string | null = null

    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }

    if (!raw) return null

    try {
      const parsed = JSON.parse(raw) as Partial<PendingResponseIntent>

      if (typeof parsed.requestId !== 'number' || typeof parsed.savedAt !== 'number') {
        return null
      }
      if (parsed.requestId !== requestId) return null
      if (Date.now() - parsed.savedAt > TTL_MS) return null

      return {
        requestId: parsed.requestId,
        message: typeof parsed.message === 'string' ? parsed.message : '',
        phone: typeof parsed.phone === 'string' ? parsed.phone : '',
        savedAt: parsed.savedAt,
      }
    } catch {
      return null
    }
  }, [])

  return { save, read, clear }
}
