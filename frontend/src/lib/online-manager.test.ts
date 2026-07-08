import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { onlineManager } from '@tanstack/react-query'

function setNavigatorOnline(isOnline: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: isOnline,
  })
}

async function loadOnlineManager() {
  vi.resetModules()
  return import('./online-manager')
}

describe('setupOnlineManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    onlineManager.setOnline(true)
  })

  afterEach(() => {
    vi.useRealTimers()
    setNavigatorOnline(true)
    onlineManager.setOnline(true)
  })

  it('does not expose a transient offline startup sample', async () => {
    setNavigatorOnline(false)
    const { setupOnlineManager, OFFLINE_CONFIRMATION_DELAY_MS } = await loadOnlineManager()

    setupOnlineManager()

    expect(onlineManager.isOnline()).toBe(true)

    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(OFFLINE_CONFIRMATION_DELAY_MS)

    expect(onlineManager.isOnline()).toBe(true)
  })

  it('publishes offline after the browser remains offline through the confirmation window', async () => {
    setNavigatorOnline(false)
    const { setupOnlineManager, OFFLINE_CONFIRMATION_DELAY_MS } = await loadOnlineManager()

    setupOnlineManager()

    await vi.advanceTimersByTimeAsync(OFFLINE_CONFIRMATION_DELAY_MS - 1)
    expect(onlineManager.isOnline()).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    expect(onlineManager.isOnline()).toBe(false)
  })

  it('publishes online immediately after confirmed offline', async () => {
    setNavigatorOnline(false)
    const { setupOnlineManager, OFFLINE_CONFIRMATION_DELAY_MS } = await loadOnlineManager()

    setupOnlineManager()
    await vi.advanceTimersByTimeAsync(OFFLINE_CONFIRMATION_DELAY_MS)
    expect(onlineManager.isOnline()).toBe(false)

    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))

    expect(onlineManager.isOnline()).toBe(true)
  })
})
