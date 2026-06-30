import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { calculateBackoffMs } from './backoff'
import { generateQueueId } from './id'
import { createListenerHub } from './listeners'
import { extractHttpStatus, isRetryableHttpError } from './retryable'

describe('queue-core', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateQueueId', () => {
    it('uses crypto.randomUUID when available', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')

      expect(generateQueueId()).toBe('00000000-0000-4000-8000-000000000001')
    })

    it('falls back to a time-based id when randomUUID is unavailable', () => {
      const randomUuidDescriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })

      try {
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
        vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

        const id = generateQueueId()
        expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/)
        expect(id.startsWith(`${Date.now().toString(36)}-`)).toBe(true)
      } finally {
        if (randomUuidDescriptor) {
          Object.defineProperty(crypto, 'randomUUID', randomUuidDescriptor)
        } else {
          Reflect.deleteProperty(crypto, 'randomUUID')
        }
      }
    })
  })

  describe('calculateBackoffMs', () => {
    it('applies exponential backoff capped at the maximum', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)

      expect(calculateBackoffMs(1)).toBe(1000)
      expect(calculateBackoffMs(2)).toBe(2000)
      expect(calculateBackoffMs(6)).toBe(30_000)
    })

    it('adds jitter within the configured range', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      expect(calculateBackoffMs(1, { jitterMs: 500 })).toBe(1250)
    })
  })

  describe('isRetryableHttpError', () => {
    it('treats missing status as retryable', () => {
      expect(isRetryableHttpError(new Error('Network down'))).toBe(true)
    })

    it('classifies common transient and server statuses as retryable', () => {
      expect(isRetryableHttpError({ response: { status: 408 } })).toBe(true)
      expect(isRetryableHttpError({ response: { status: 429 } })).toBe(true)
      expect(isRetryableHttpError({ response: { status: 500 } })).toBe(true)
    })

    it('treats client errors as non-retryable', () => {
      expect(isRetryableHttpError({ response: { status: 422 } })).toBe(false)
      expect(isRetryableHttpError({ response: { status: 404 } })).toBe(false)
    })

    it('extracts HTTP status from axios-shaped errors', () => {
      expect(extractHttpStatus({ response: { status: 503 } })).toBe(503)
      expect(extractHttpStatus(new Error('plain'))).toBeUndefined()
    })
  })

  describe('createListenerHub', () => {
    it('notifies subscribers and supports unsubscribe', () => {
      const hub = createListenerHub()
      const listener = vi.fn()

      const unsubscribe = hub.subscribe(listener)
      hub.notify()
      unsubscribe()
      hub.notify()

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('clears all subscribers', () => {
      const hub = createListenerHub()
      const listener = vi.fn()

      hub.subscribe(listener)
      hub.clear()
      hub.notify()

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
