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
  /* oxlint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
  const g = globalThis as any
  const progressEvent = PolyfillProgressEvent

  Object.defineProperty(g, 'ProgressEvent', {
    configurable: true,
    writable: true,
    value: progressEvent,
  })

  // Also ensure it's on Node's `global` if we're in Node
  if (typeof global !== 'undefined') {
    Object.defineProperty(global as any, 'ProgressEvent', {
      configurable: true,
      writable: true,
      value: progressEvent,
    })
  }

  // Also ensure it's on `window` if we're in JSDOM
  if (typeof window !== 'undefined') {
    Object.defineProperty(window as any, 'ProgressEvent', {
      configurable: true,
      writable: true,
      value: progressEvent,
    })
  }

  if (typeof self !== 'undefined') {
    Object.defineProperty(self as any, 'ProgressEvent', {
      configurable: true,
      writable: true,
      value: progressEvent,
    })
  }
  /* oxlint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
}

polyfillProgressEvent()
