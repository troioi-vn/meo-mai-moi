import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

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

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>()
  return {
    ...actual,
    Toaster: () => null,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }
})

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
