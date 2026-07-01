export interface BackoffOptions {
  baseMs?: number
  maxMs?: number
  jitterMs?: number
}

const DEFAULT_BASE_MS = 1000
const DEFAULT_MAX_MS = 30_000
const DEFAULT_JITTER_MS = 500

export function calculateBackoffMs(attempts: number, options: BackoffOptions = {}): number {
  const baseMs = options.baseMs ?? DEFAULT_BASE_MS
  const maxMs = options.maxMs ?? DEFAULT_MAX_MS
  const jitterMs = options.jitterMs ?? DEFAULT_JITTER_MS
  const base = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempts - 1))

  return base + Math.floor(Math.random() * jitterMs)
}
