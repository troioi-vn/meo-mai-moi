import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Configure testing library to be less verbose
configure({
  getElementError: (message) => {
    // Return a much shorter error message without the full DOM dump
    const error = new Error(message ?? 'Element not found')
    error.name = 'TestingLibraryElementError'
    return error
  },
})

// Polyfill for PointerEvents (minimal, typed)
class TestPointerEvent extends MouseEvent {
  public pointerId?: number
  constructor(type: string, params: PointerEventInit) {
    super(type, params)
    this.pointerId = params.pointerId
  }
}
// Assign only if missing
;(globalThis as unknown as { PointerEvent?: typeof MouseEvent }).PointerEvent =
  TestPointerEvent as unknown as typeof MouseEvent

// Polyfills for PointerEvent methods on Element
// Use arrow functions to avoid unbound-method rule
Element.prototype.hasPointerCapture = (() =>
  false) as unknown as typeof Element.prototype.hasPointerCapture
Element.prototype.setPointerCapture = (() => {
  /* no-op */
}) as unknown as typeof Element.prototype.setPointerCapture
Element.prototype.releasePointerCapture = (() => {
  /* no-op */
}) as unknown as typeof Element.prototype.releasePointerCapture

// Polyfill for scrollIntoView
window.HTMLElement.prototype.scrollIntoView = (() => {
  /* no-op */
}) as typeof window.HTMLElement.prototype.scrollIntoView

vi.mock('sonner', () => {
  const Toaster = () => null
  return {
    __esModule: true,
    default: Toaster,
    Toaster,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }
})

// Also mock our Sonner wrapper component to avoid importing the real module
vi.mock('@/components/ui/sonner', () => ({
  __esModule: true,
  Toaster: () => null,
  default: () => null,
}))

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
;(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver = MockResizeObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Polyfill ProgressEvent for MSW XHR in Node test environment
if (!(globalThis as { ProgressEvent?: unknown }).ProgressEvent) {
  class PolyfillProgressEvent extends Event {
    lengthComputable = false
    loaded = 0
    total = 0
    constructor(
      type: string,
      init?: { lengthComputable?: boolean; loaded?: number; total?: number }
    ) {
      super(type)
      if (init) {
        this.lengthComputable = !!init.lengthComputable
        this.loaded = init.loaded ?? 0
        this.total = init.total ?? 0
      }
    }
  }
  ;(globalThis as { ProgressEvent?: unknown }).ProgressEvent = PolyfillProgressEvent
}

// Mock Navigator APIs - but allow tests to override
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})

Object.defineProperty(navigator, 'share', {
  writable: true,
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

// No need to mock buttonVariants export from button anymore

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterAll(() => {
  server.close()
})
afterEach(() => {
  server.resetHandlers()
  cleanup()
})
