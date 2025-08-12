import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

// Polyfill for PointerEvents
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    public pointerId?: number;
    constructor(type: string, params: PointerEventInit) {
      super(type, params);
      this.pointerId = params.pointerId;
    }
  }
  global.PointerEvent = PointerEvent as any;
}

// Polyfills for PointerEvent methods on Element
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function (pointerId: number): boolean {
    // Return a mock value
    return false;
  };
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function (pointerId: number): void {
    // No-op
  };
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function (pointerId: number): void {
    // No-op
  };
}

// Polyfill for scrollIntoView
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}


vi.mock('sonner', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    Toaster: () => null, // Mock Toaster component
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
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
  })),
});

vi.mock('@/components/ui/button', async () => {
  const actual = await vi.importActual('@/components/ui/button');
  return {
    ...actual,
    buttonVariants: () => '',
  };
});

beforeAll(() => { server.listen({ onUnhandledRequest: 'error' }); });
afterAll(() => { server.close(); });
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
