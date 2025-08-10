import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { server } from './mocks/server';

// Polyfill for PointerEvent
if (!('PointerEvent' in globalThis)) {
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
  ;(globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = PointerEvent as unknown as typeof MouseEvent
}

if (!('hasPointerCapture' in Element.prototype)) {
  (Element.prototype as unknown as { hasPointerCapture: (pointerId: number) => boolean }).hasPointerCapture = function (): boolean {
    return false
  }
}

if (!('setPointerCapture' in Element.prototype)) {
  (Element.prototype as unknown as { setPointerCapture: (pointerId: number) => void }).setPointerCapture = function (): void {
    // no-op for tests
  }
}

if (!('releasePointerCapture' in Element.prototype)) {
  (Element.prototype as unknown as { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture = function (): void {
    // no-op for tests
  }
}

if (!('scrollIntoView' in window.HTMLElement.prototype)) {
  (window.HTMLElement.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = function () {
    // no-op for tests
  }
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
