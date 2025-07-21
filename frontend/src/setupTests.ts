/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'
import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'
import { mockCat, anotherMockCat } from './mocks/data/cats'

// Mock axios and the api instance it creates
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: { data: { id: 1, name: 'Test User', email: 'test@example.com' } } })),
      post: vi.fn((url) => {
        if (url === '/login') {
          return Promise.resolve({ data: { data: { access_token: 'mock_access_token' } } });
        }
        return Promise.resolve({ data: { data: {} } });
      }),
      put: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
      defaults: {
        headers: {
          common: {},
        },
      },
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    })),
    get: vi.fn(() => Promise.resolve()),
    post: vi.fn(() => Promise.resolve()),
    put: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    default: mockAxios,
    ...mockAxios,
    AxiosError: class AxiosError extends Error {
      response?: { data: { message: string } };
      constructor(message: string, response?: { data: { message: string } }) {
        super(message);
        this.name = 'AxiosError';
        this.response = response;
      }
    },
  };
});

// Establish API mocking before all tests.
beforeAll(() => {
  server.listen()

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
  )
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
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia,
})

// Mock scrollIntoView as it's not implemented in JSDOM
HTMLElement.prototype.scrollIntoView = vi.fn()