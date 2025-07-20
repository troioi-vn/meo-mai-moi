/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen()
})
// Reset any request handlers that are declared as a part of tests
// (i.e. for testing one-time error scenarios)
afterEach(() => {
  server.resetHandlers()
})
// Clean up after the tests are finished.
afterAll(() => {
  server.close()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia,
})

// Mock scrollIntoView as it's not implemented in JSDOM
HTMLElement.prototype.scrollIntoView = vi.fn();