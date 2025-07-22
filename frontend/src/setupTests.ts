import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'

// Mock matchMedia for components that use it (e.g., shadcn/ui components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class IntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserver,
})

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen()
})

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-off error cases).
afterEach(() => {
  server.resetHandlers()
  cleanup()
})

// Clean up after the tests are finished.
afterAll(() => {
  server.close()
})
