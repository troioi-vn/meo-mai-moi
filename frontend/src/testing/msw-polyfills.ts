// Test-time polyfills needed by MSW's Node/XHR interceptors.
//
// Important: this module must be imported before any `msw` / `msw/node` imports.

// Ensure ProgressEvent is properly defined for MSW interceptors
// In jsdom, ProgressEvent may not be fully compatible with MSW's needs
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
      this.lengthComputable = Boolean(init.lengthComputable)
      this.loaded = init.loaded ?? 0
      this.total = init.total ?? 0
    }
  }
}

/**
 * Robustly assign ProgressEvent to all possible global scopes.
 */
function polyfillProgressEvent() {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  const g = globalThis as any

  if (typeof g.ProgressEvent === 'undefined') {
    g.ProgressEvent = PolyfillProgressEvent
  }

  // Also ensure it's on Node's `global` if we're in Node
  if (typeof global !== 'undefined' && typeof (global as any).ProgressEvent === 'undefined') {
    ;(global as any).ProgressEvent = PolyfillProgressEvent
  }

  // Also ensure it's on `window` if we're in JSDOM
  if (typeof window !== 'undefined' && typeof (window as any).ProgressEvent === 'undefined') {
    ;(window as any).ProgressEvent = PolyfillProgressEvent
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
}

polyfillProgressEvent()
