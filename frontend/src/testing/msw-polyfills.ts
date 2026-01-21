// Test-time polyfills needed by MSW's Node/XHR interceptors.
//
// Important: this module must be imported before any `msw` / `msw/node` imports.

if (!(globalThis as { ProgressEvent?: unknown }).ProgressEvent) {
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

  ;(globalThis as { ProgressEvent?: unknown }).ProgressEvent = PolyfillProgressEvent
}
