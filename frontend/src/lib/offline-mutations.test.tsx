import { describe, expect, it, vi, beforeEach } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'
import { isOfflineWriteNetworkError, markOfflineForWriteReplay } from './offline-mutations'

function setNavigatorOnline(isOnline: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  })
}

describe('offline-mutations', () => {
  beforeEach(() => {
    setNavigatorOnline(true)
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

  it('marks React Query offline when a failed write agrees with browser connectivity', () => {
    setNavigatorOnline(false)

    markOfflineForWriteReplay()

    expect(onlineManager.isOnline()).toBe(false)
  })

  it('does not poison global connectivity for a response-less failure while browser is online', () => {
    markOfflineForWriteReplay()

    expect(onlineManager.isOnline()).toBe(true)
  })
})
