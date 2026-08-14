import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

type ReporterModule = typeof import('./error-reporter')

async function loadReporter(): Promise<ReporterModule> {
  vi.resetModules()
  return import('./error-reporter')
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

function rejectionEvent(reason: unknown): PromiseRejectionEvent {
  const event = new Event('unhandledrejection') as PromiseRejectionEvent
  Object.defineProperty(event, 'reason', { configurable: true, value: reason })
  return event
}

function postedPayload(fetchMock: ReturnType<typeof vi.fn>, call = 0): Record<string, unknown> {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

afterEach(() => {
  setOnline(true)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('error reporter', () => {
  it('reports global errors and installs its handlers only once', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    window.history.replaceState({}, '', '/global-error-route')
    const { installGlobalErrorHandlers } = await loadReporter()

    const cleanup = installGlobalErrorHandlers()
    installGlobalErrorHandlers()
    const error = new TypeError('global boom')
    error.stack = 'TypeError: global boom\n    at globalTask (app.ts:10:4)'
    window.dispatchEvent(
      new ErrorEvent('error', {
        error,
        message: error.message,
        filename: 'app.ts',
        lineno: 10,
        colno: 4,
      })
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(postedPayload(fetchMock)).toMatchObject({
      message: 'global boom',
      stack: error.stack,
      route: '/global-error-route',
      exception_class: 'TypeError',
      app_version: import.meta.env.VITE_APP_VERSION,
      context: {
        source: 'window_error',
        filename: 'app.ts',
        line: '10',
        column: '4',
      },
    })
    cleanup()
  })

  it.each([
    ['a string', 'a string'],
    [{ reason: 'an object' }, '{"reason":"an object"}'],
    [undefined, 'undefined'],
  ])('safely reports a non-Error rejection value %#', async (reason, expectedMessage) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    const { installGlobalErrorHandlers } = await loadReporter()

    const cleanup = installGlobalErrorHandlers()
    window.dispatchEvent(rejectionEvent(reason))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(postedPayload(fetchMock)).toMatchObject({
      message: expectedMessage,
      context: { source: 'unhandled_rejection' },
    })
    cleanup()
  })

  it('deduplicates repeated errors by message and first stack frame', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    const { reportError } = await loadReporter()
    const first = new Error('repeat me')
    first.stack = 'Error: repeat me\n    at sameFrame (app.ts:1:1)\n    at oneCaller (a.ts:1:1)'
    const second = new Error('repeat me')
    second.stack =
      'Error: repeat me\n    at sameFrame (app.ts:1:1)\n    at anotherCaller (b.ts:1:1)'

    reportError(first)
    reportError(second)
    reportError(first)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caps unique reports per page load', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    const { reportError } = await loadReporter()

    for (let index = 0; index < 20; index += 1) {
      reportError(new Error(`unique error ${index}`))
    }

    expect(fetchMock).toHaveBeenCalledTimes(10)
  })

  it('does not send while the browser is offline', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(false)
    const { reportError } = await loadReporter()

    expect(() => {
      reportError(new Error('offline error'))
    }).not.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('truncates every bounded payload field, including encoded context', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    window.history.replaceState({}, '', `/${'r'.repeat(3000)}`)
    const { reportError } = await loadReporter()
    const error = new Error('m'.repeat(3000))
    error.name = 'E'.repeat(300)
    error.stack = `Error: oversized\n    at firstFrame (app.ts:1:1)\n${'s'.repeat(25_000)}`

    reportError(error, {
      component_stack: '界'.repeat(10_000),
      another_value: 'x'.repeat(10_000),
    })

    const payload = postedPayload(fetchMock)
    expect((payload.message as string).length).toBe(2000)
    expect((payload.route as string).length).toBe(2048)
    expect((payload.exception_class as string).length).toBe(255)
    expect((payload.stack as string).length).toBe(20_000)
    expect((payload.app_version as string).length).toBeLessThanOrEqual(100)
    const context = payload.context as Record<string, string>
    expect(Object.values(context).every((value) => value.length <= 2000)).toBe(true)
    expect(new TextEncoder().encode(JSON.stringify(context)).length).toBeLessThanOrEqual(16 * 1024)
  })

  it('swallows network, HTTP, and serialization failures without recursion', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ ok: false, status: 500 })
    vi.stubGlobal('fetch', fetchMock)
    setOnline(true)
    const { installGlobalErrorHandlers, reportError } = await loadReporter()
    const cleanup = installGlobalErrorHandlers()

    expect(() => {
      reportError(new Error('network report'))
    }).not.toThrow()
    expect(() => {
      reportError(new Error('HTTP report'))
    }).not.toThrow()
    expect(() => {
      reportError({
        toJSON() {
          throw new Error('JSON exploded')
        },
      })
    }).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    cleanup()
  })
})
