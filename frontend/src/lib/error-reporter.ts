const ERROR_EVENT_ENDPOINT =
  import.meta.env.MODE === 'test' ? 'http://localhost:3000/api/error-events' : '/api/error-events'

const MAX_MESSAGE_LENGTH = 2000
const MAX_ROUTE_LENGTH = 2048
const MAX_EXCEPTION_CLASS_LENGTH = 255
const MAX_STACK_LENGTH = 20_000
const MAX_APP_VERSION_LENGTH = 100
const MAX_CONTEXT_ENTRIES = 100
const MAX_CONTEXT_VALUE_LENGTH = 2000
const MAX_CONTEXT_BYTES = 16 * 1024
const MAX_REPORTS_PER_PAGE = 10

type ErrorContext = Record<string, unknown>

interface NormalizedError {
  message: string
  exceptionClass?: string
  stack?: string
}

interface ErrorEventPayload {
  message: string
  route: string
  exception_class?: string
  stack?: string
  app_version?: string
  context?: Record<string, string>
}

const reportedSignatures = new Set<string>()
let reportCount = 0
let isReporting = false
let globalHandlersInstalled = false

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength)
}

function safelyStringify(value: unknown): string {
  try {
    if (typeof value === 'string') return value

    const serialized = JSON.stringify(value)
    if (typeof serialized === 'string') return serialized
  } catch {
    // Fall through to String for circular values, BigInts, and throwing toJSON methods.
  }

  try {
    return String(value)
  } catch {
    return 'Unknown error'
  }
}

function normalizeError(error: unknown): NormalizedError {
  try {
    if (error instanceof Error) {
      const message = truncate(error.message || error.name || 'Unknown error', MAX_MESSAGE_LENGTH)
      const exceptionClass = error.name
        ? truncate(error.name, MAX_EXCEPTION_CLASS_LENGTH)
        : undefined
      const stack = error.stack ? truncate(error.stack, MAX_STACK_LENGTH) : undefined

      return { message, exceptionClass, stack }
    }
  } catch {
    // An Error subclass may expose throwing accessors. Treat it like any unknown value.
  }

  return { message: truncate(safelyStringify(error), MAX_MESSAGE_LENGTH) }
}

function encodedLength(value: string): number {
  try {
    return new TextEncoder().encode(value).length
  } catch {
    return value.length * 3
  }
}

function sanitizeContext(context: ErrorContext | undefined): Record<string, string> | undefined {
  if (!context) return undefined

  const sanitizedEntries: [string, string][] = []
  let entries: [string, unknown][]

  try {
    entries = Object.entries(context).slice(0, MAX_CONTEXT_ENTRIES)
  } catch {
    return undefined
  }

  for (const [rawKey, rawValue] of entries) {
    const key = safelyStringify(rawKey)
    const value = truncate(safelyStringify(rawValue), MAX_CONTEXT_VALUE_LENGTH)
    let shortest = 0
    let longest = value.length
    let bestValue: string | undefined

    while (shortest <= longest) {
      const length = Math.floor((shortest + longest) / 2)
      const candidateValue = value.slice(0, length)
      const candidate = Object.fromEntries([...sanitizedEntries, [key, candidateValue]])
      const encoded = JSON.stringify(candidate)

      if (encodedLength(encoded) <= MAX_CONTEXT_BYTES) {
        bestValue = candidateValue
        shortest = length + 1
      } else {
        longest = length - 1
      }
    }

    if (bestValue !== undefined) sanitizedEntries.push([key, bestValue])
  }

  return sanitizedEntries.length > 0 ? Object.fromEntries(sanitizedEntries) : undefined
}

function firstStackFrame(stack: string | undefined): string {
  if (!stack) return ''

  const lines = stack.split('\n')
  return lines.find((line, index) => index > 0 && line.trim().length > 0)?.trim() ?? ''
}

function currentRoute(): string {
  try {
    return truncate(window.location.pathname || '/', MAX_ROUTE_LENGTH)
  } catch {
    return '/'
  }
}

function isOffline(): boolean {
  try {
    return !navigator.onLine
  } catch {
    return false
  }
}

export function reportError(error: unknown, context?: ErrorContext): void {
  try {
    if (isReporting || isOffline() || reportCount >= MAX_REPORTS_PER_PAGE) return

    isReporting = true
    const normalized = normalizeError(error)
    const signature = `${normalized.message}\n${firstStackFrame(normalized.stack)}`
    if (reportedSignatures.has(signature)) return

    const appVersion = truncate(import.meta.env.VITE_APP_VERSION ?? '', MAX_APP_VERSION_LENGTH)
    const payload: ErrorEventPayload = {
      message: normalized.message,
      route: currentRoute(),
      exception_class: normalized.exceptionClass,
      stack: normalized.stack,
      app_version: appVersion || undefined,
      context: sanitizeContext(context),
    }

    const body = JSON.stringify(payload)
    reportedSignatures.add(signature)
    reportCount += 1

    try {
      void fetch(ERROR_EVENT_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true,
      }).catch(() => undefined)
    } catch {
      // Reporting is best-effort and must never become a new application error.
    }
  } catch {
    // Error handlers run on already-broken paths. Nothing may escape this function.
  } finally {
    isReporting = false
  }
}

export function installGlobalErrorHandlers(): () => void {
  try {
    if (globalHandlersInstalled || typeof window === 'undefined') return () => undefined

    const handleError = (event: ErrorEvent) => {
      try {
        reportError(event.error ?? event.message, {
          source: 'window_error',
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        })
      } catch {
        // Native event properties should be safe, but no handler failure may escape.
      }
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        reportError(event.reason, { source: 'unhandled_rejection' })
      } catch {
        // Keep hostile rejection values or event implementations contained.
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    globalHandlersInstalled = true

    return () => {
      try {
        window.removeEventListener('error', handleError)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        globalHandlersInstalled = false
      } catch {
        // Cleanup is also safe on partially torn-down browser environments.
      }
    }
  } catch {
    return () => undefined
  }
}
