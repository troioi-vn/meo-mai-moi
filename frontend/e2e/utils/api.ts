import type { Page } from '@playwright/test'

export interface ApiResult<T> {
  ok: boolean
  status: number
  body: T | null
}

/**
 * One authenticated request issued from inside the page.
 *
 * Fixtures that go straight to the API skip a lot of clicking, but they have to
 * carry what the SPA carries: the session cookie and the CSRF token Sanctum
 * handed it. Running the `fetch` in the page context is what supplies both.
 *
 * Write routes are throttled per minute and the suite reuses a handful of
 * seeded accounts, so a 429 is a normal thing to meet rather than a defect. This
 * waits out the window the server names instead of failing whichever test
 * happened to be running when the budget ran out.
 */
export async function apiRequest<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResult<T>> {
  const raw = await page.evaluate<
    { ok: boolean; status: number; text: string },
    { method: string; path: string; body: unknown }
  >(
    async ({ method: verb, path: url, body: payload }) => {
      const xsrfCookie = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]

      for (let attempt = 0; ; attempt += 1) {
        const response = await fetch(url, {
          method: verb,
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(payload === null ? {} : { 'Content-Type': 'application/json' }),
            ...(xsrfCookie ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie) } : {}),
          },
          ...(payload === null ? {} : { body: JSON.stringify(payload) }),
        })

        if (response.status !== 429 || attempt >= 5) {
          return { ok: response.ok, status: response.status, text: await response.text() }
        }

        // The authenticated limiter counts per minute, so a fixed short backoff
        // never outlives the window. Capped, so a misreported header cannot
        // stall the whole run.
        const retryAfter = Number(response.headers.get('Retry-After') ?? '0')
        const waitSeconds =
          Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 65) : attempt + 1

        await new Promise((resolve) => {
          window.setTimeout(resolve, waitSeconds * 1000)
        })
      }
    },
    { method, path, body: body ?? null }
  )

  let parsed: T | null = null
  if (raw.text) {
    try {
      parsed = JSON.parse(raw.text) as T
    } catch {
      parsed = null
    }
  }

  return { ok: raw.ok, status: raw.status, body: parsed }
}

/**
 * Same, but a non-2xx is a broken fixture rather than a result to inspect.
 *
 * The message carries the status and whatever the envelope said, because the
 * alternative is a test failing several steps later on a missing element with
 * no hint that its setup never happened.
 */
export async function apiRequestOrThrow<T = unknown>(
  page: Page,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const result = await apiRequest<{ data?: T; message?: string }>(page, method, path, body)

  if (!result.ok) {
    const message = result.body?.message
    throw new Error(
      `${method} ${path} failed: ${String(result.status)}${message ? ` ${message}` : ''}`
    )
  }

  const envelope = result.body
  if (
    envelope &&
    typeof envelope === 'object' &&
    'data' in envelope &&
    envelope.data !== undefined
  ) {
    return envelope.data
  }

  return envelope as unknown as T
}
