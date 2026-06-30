import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { registerSW } from 'virtual:pwa-register'

const mocks = vi.hoisted(() => {
  const mockUpdateSw = vi.fn().mockResolvedValue(undefined)
  const reloadMock = vi.fn()
  const mockRegistrationUpdate = vi.fn().mockResolvedValue(undefined)
  const focusListeners = new Set<EventListenerOrEventListenerObject>()
  let capturedOptions: Parameters<typeof registerSW>[0] | undefined

  const mockRegistration = {
    scope: 'http://localhost/',
    update: mockRegistrationUpdate,
  } as unknown as ServiceWorkerRegistration

  return {
    mockUpdateSw,
    reloadMock,
    mockRegistrationUpdate,
    focusListeners,
    capturedOptions,
    mockRegistration,
    captureRegisterOptions(options: Parameters<typeof registerSW>[0] | undefined) {
      capturedOptions = options
    },
    getCapturedOptions() {
      return capturedOptions
    },
  }
})

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((options?: Parameters<typeof registerSW>[0]) => {
    mocks.captureRegisterOptions(options)
    return mocks.mockUpdateSw
  }),
}))

const testDir = path.dirname(fileURLToPath(import.meta.url))

async function loadPwaModule(forceReload = false) {
  vi.resetModules()
  vi.stubEnv('VITE_FORCE_RELOAD_ON_UPDATE', forceReload ? 'true' : 'false')

  return import('@/pwa')
}

async function initRegisteredPwa(forceReload = false) {
  const pwa = await loadPwaModule(forceReload)
  pwa.initPwaServiceWorker()

  await vi.waitFor(() => {
    expect(registerSW).toHaveBeenCalled()
  })

  const options = mocks.getCapturedOptions()
  options?.onRegisteredSW?.('/sw.js', mocks.mockRegistration)

  return { pwa, options }
}

describe('pwa service worker update flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.captureRegisterOptions(undefined)
    mocks.focusListeners.clear()

    const originalAddEventListener = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'focus') {
        mocks.focusListeners.add(listener)
      }

      originalAddEventListener(type, listener, options)
    })

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: window.location.href,
        reload: mocks.reloadMock,
      },
    })

    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      configurable: true,
    })

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        addEventListener: vi.fn(),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    for (const listener of mocks.focusListeners) {
      window.removeEventListener('focus', listener)
    }
    mocks.focusListeners.clear()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('keeps vite PWA registerType prompt for user-controlled updates', () => {
    const viteConfig = fs.readFileSync(path.resolve(testDir, '../vite.config.ts'), 'utf8')

    expect(viteConfig).toMatch(/registerType:\s*'prompt'/)
  })

  it('invokes the registered refresh callback when force reload is disabled', async () => {
    const { pwa, options } = await initRegisteredPwa(false)
    const refreshCallback = vi.fn()

    pwa.setNeedsRefreshCallback(refreshCallback)
    options?.onNeedRefresh?.()

    expect(refreshCallback).toHaveBeenCalledTimes(1)
    expect(mocks.mockUpdateSw).not.toHaveBeenCalled()
    expect(mocks.reloadMock).not.toHaveBeenCalled()
  })

  it('does not invoke the refresh callback again while an update is already pending', async () => {
    const { pwa, options } = await initRegisteredPwa(false)
    const refreshCallback = vi.fn()

    pwa.setNeedsRefreshCallback(refreshCallback)
    options?.onNeedRefresh?.()
    options?.onNeedRefresh?.()

    expect(refreshCallback).toHaveBeenCalledTimes(1)
    expect(mocks.mockUpdateSw).not.toHaveBeenCalled()
    expect(mocks.reloadMock).not.toHaveBeenCalled()
  })

  it('forces reload through triggerAppUpdate when VITE_FORCE_RELOAD_ON_UPDATE is true', async () => {
    const { options } = await initRegisteredPwa(true)
    const refreshCallback = vi.fn()

    options?.onNeedRefresh?.()

    expect(refreshCallback).not.toHaveBeenCalled()
    expect(mocks.mockUpdateSw).toHaveBeenCalledWith(true)
  })

  it('checks for updates on focus without forcing reload while an update is pending', async () => {
    const { pwa, options } = await initRegisteredPwa(false)
    const refreshCallback = vi.fn()

    pwa.setNeedsRefreshCallback(refreshCallback)
    options?.onNeedRefresh?.()

    mocks.mockRegistrationUpdate.mockClear()
    mocks.mockUpdateSw.mockClear()
    mocks.reloadMock.mockClear()

    window.dispatchEvent(new Event('focus'))

    expect(mocks.mockRegistrationUpdate).toHaveBeenCalledTimes(1)
    expect(refreshCallback).toHaveBeenCalledTimes(1)
    expect(mocks.mockUpdateSw).not.toHaveBeenCalled()
    expect(mocks.reloadMock).not.toHaveBeenCalled()
  })

  it('only reloads when triggerAppUpdate is called explicitly', async () => {
    const { pwa } = await initRegisteredPwa(false)

    pwa.triggerAppUpdate()

    expect(mocks.mockUpdateSw).toHaveBeenCalledWith(true)
    expect(mocks.reloadMock).not.toHaveBeenCalled()
  })
})
