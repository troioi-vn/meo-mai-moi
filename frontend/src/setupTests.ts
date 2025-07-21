/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { mockCat, anotherMockCat } from './mocks/data/cats'

// Establish API mocking before all tests.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  server.listen();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Mock the /user endpoint for AuthContext
  server.use(
    http.get('http://localhost:3000/api/user', () => {
      return HttpResponse.json({ data: { data: { id: 1, name: 'Test User', email: 'test@example.com' } } })
    }),
    http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
      return HttpResponse.json({ message: 'CSRF cookie set' })
    }),
    http.get('http://localhost:3000/api/cats', () => {
      return HttpResponse.json([mockCat, anotherMockCat])
    }),
    http.get('http://localhost:3000/api/my-cats', () => {
      return HttpResponse.json([mockCat, anotherMockCat])
    }),
    http.post('http://localhost:3000/api/login', () => {
      return HttpResponse.json({ data: { access_token: 'mock_access_token' } })
    })
  );
});

// Reset any request handlers that are declared as a part of tests
// (i.e. for testing one-time error scenarios)
afterEach(() => {
  server.resetHandlers();
  vi.clearAllTimers();
  consoleErrorSpy.mockRestore();
});

// Clean up after the tests are finished.
afterAll(() => {
  server.close();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia,
})

// Mock scrollIntoView as it's not implemented in JSDOM
HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock the Toaster component from sonner
vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));