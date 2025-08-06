import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

// Polyfill for PointerEvent
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    public pointerId?: number
    public width?: number
    public height?: number
    public pressure?: number
    public tangentialPressure?: number
    public tiltX?: number
    public tiltY?: number
    public twist?: number
    public pointerType?: string
    public isPrimary?: boolean

    constructor(type: string, params: PointerEventInit) {
      super(type, params)
      this.pointerId = params.pointerId
      this.width = params.width
      this.height = params.height
      this.pressure = params.pressure
      this.tangentialPressure = params.tangentialPressure
      this.tiltX = params.tiltX
      this.tiltY = params.tiltY
      this.twist = params.twist
      this.pointerType = params.pointerType
      this.isPrimary = params.isPrimary
    }
  }
  global.PointerEvent = PointerEvent as any
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function (pointerId: number): boolean {
    return false
  }
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function (pointerId: number): void {}
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function (pointerId: number): void {}
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}


vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal();
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
  value: vi.fn().mockImplementation(query => ({
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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
