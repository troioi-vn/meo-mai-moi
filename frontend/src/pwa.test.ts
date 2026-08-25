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

  it('pairs navigation fallback with the installed PWA start URL', () => {
    const viteConfig = fs.readFileSync(path.resolve(testDir, '../vite.config.ts'), 'utf8')
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(testDir, '../public/site.webmanifest'), 'utf8')
    ) as { id?: string; start_url?: string }

    expect(viteConfig).toMatch(/navigateFallback:\s*'\/build\/index\.html'/)
    expect(manifest.start_url).toBe('/build/index.html')
    expect(manifest.id).toBe('/')
  })

  it('publishes Digital Asset Links for the Android package and upload certificate', () => {
    const sourcePath = path.resolve(testDir, '../public/.well-known/assetlinks.json')
    const backendPath = path.resolve(testDir, '../../backend/public/.well-known/assetlinks.json')
    const source = fs.readFileSync(sourcePath, 'utf8')
    const statements = JSON.parse(source) as {
      relation: string[]
      target: {
        namespace: string
        package_name: string
        sha256_cert_fingerprints: string[]
      }
    }[]

    expect(fs.readFileSync(backendPath, 'utf8')).toBe(source)
    expect(statements).toHaveLength(1)
    expect(statements[0]?.relation).toContain('delegate_permission/common.handle_all_urls')
    expect(statements[0]?.target).toMatchObject({
      namespace: 'android_app',
      package_name: 'com.meomaimoi.app',
    })
    expect(statements[0]?.target.sha256_cert_fingerprints).toContain(
      '00:8A:B2:08:E3:84:7D:66:D2:C1:9A:17:0C:12:11:83:36:35:78:93:C5:31:45:1A:78:AD:A9:1D:60:05:7A:BF'
    )
  })

  it('denylists server routes but keeps React request routes on the app-shell fallback', () => {
    const viteConfig = fs.readFileSync(path.resolve(testDir, '../vite.config.ts'), 'utf8')

    expect(viteConfig).toMatch(/navigateFallbackDenylist:/)
    expect(viteConfig).toMatch(/\^\\\/api\\\//)
    expect(viteConfig).toMatch(/\^\\\/auth\\\//)
    expect(viteConfig).toMatch(/\^\\\/demo\\\/login/)
    expect(viteConfig).toMatch(/\^\\\/sanctum\\\//)
    expect(viteConfig).toMatch(/\/\^\\\/admin\(\?:\\\/\|\$\)\//)
    expect(viteConfig).toMatch(/\^\\\/livewire\\\//)
    expect(viteConfig).toMatch(/\^\\\/storage\\\//)
    expect(viteConfig).toMatch(/\^\\\/email\\\/verify\\\/\\d\+\\\//)
    expect(viteConfig).toMatch(/\^\\\/reset-password\\\//)
    expect(viteConfig).toMatch(/\^\\\/unsubscribe\(\?:\\\/\|\$\)\//)
    expect(viteConfig).not.toMatch(/\^\\\/requests\\\//)
  })

  it('keeps the legacy offline page self-healing on reconnect', () => {
    const offlinePage = fs.readFileSync(path.resolve(testDir, '../public/offline.html'), 'utf8')

    expect(offlinePage).toContain("window.addEventListener('online'")
    expect(offlinePage).toContain("navigator.serviceWorker.register('/sw.js'")
    expect(offlinePage).toContain("'SKIP_WAITING'")
    expect(offlinePage).toContain("navigator.serviceWorker?.addEventListener('controllerchange'")
  })

  it('does not runtime-cache authenticated API JSON routes', () => {
    const viteConfig = fs.readFileSync(path.resolve(testDir, '../vite.config.ts'), 'utf8')
    const runtimeCachingSection = viteConfig.slice(viteConfig.indexOf('runtimeCaching:'))

    expect(runtimeCachingSection).not.toMatch(/\/api\//)
    expect(runtimeCachingSection).not.toMatch(/\/auth\//)
    expect(runtimeCachingSection).not.toMatch(/\/sanctum\//)
    expect(runtimeCachingSection).not.toMatch(/\/admin/)
    expect(runtimeCachingSection).not.toMatch(/\/livewire\//)
  })
})
