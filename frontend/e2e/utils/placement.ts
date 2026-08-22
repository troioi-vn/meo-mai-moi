import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { gotoApp, login } from './app'

export type PlacementRequestType = 'permanent' | 'foster_free' | 'foster_paid' | 'pet_sitting'

export interface TestCredentials {
  email: string
  password: string
  name: string
}

export interface UserSession {
  context: BrowserContext
  page: Page
}

/**
 * Playwright only injects `baseURL` into test-scoped fixtures, so a context
 * built in `beforeAll` has to resolve it the same way the config does.
 */
export function resolveBaseURL(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000'
}

/**
 * A placement request needs two or three people looking at the same page at
 * once, and logging one of them out to become another costs a full round trip
 * per step. Each participant gets their own cookie jar instead.
 */
export async function openSession(browser: Browser, user: TestCredentials): Promise<UserSession> {
  const context = await browser.newContext({
    baseURL: resolveBaseURL(),
    serviceWorkers: 'block',
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()
  await login(page, user.email, user.password)

  return { context, page }
}

export async function createPlacementRequestViaApi(
  page: Page,
  options: {
    petId: number
    requestType: PlacementRequestType
    notes?: string
    endDateOffsetDays?: number
  }
): Promise<number> {
  const startDate = new Date()
  const endDate = options.endDateOffsetDays
    ? new Date(Date.now() + options.endDateOffsetDays * 24 * 60 * 60 * 1000)
    : null

  const requestId = await page.evaluate<
    number | null,
    {
      petId: number
      requestType: string
      notes: string | null
      startDate: string
      endDate: string | null
    }
  >(
    async ({ petId, requestType, notes, startDate: start, endDate: end }) => {
      const xsrfCookie = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]

      let createResponse: Response | null = null
      let createPayload:
        | { data?: { id?: number }; message?: string }
        | { id?: number; message?: string }
        | null = null

      for (let attempt = 0; attempt < 6; attempt += 1) {
        createResponse = await fetch('/api/placement-requests', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(xsrfCookie ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie) } : {}),
          },
          body: JSON.stringify({
            pet_id: petId,
            request_type: requestType,
            start_date: start,
            ...(end ? { end_date: end } : {}),
            ...(notes ? { notes } : {}),
          }),
        })

        createPayload = (await createResponse.json()) as
          | { data?: { id?: number }; message?: string }
          | { id?: number; message?: string }

        if (createResponse.ok) {
          break
        }

        if (createResponse.status !== 429 || attempt === 5) {
          const message = 'message' in createPayload ? createPayload.message : undefined
          throw new Error(
            `Failed to create placement request via API: ${String(createResponse.status)}${
              message ? ` ${message}` : ''
            } (limit ${createResponse.headers.get('X-RateLimit-Limit') ?? '?'}, retry after ${
              createResponse.headers.get('Retry-After') ?? '?'
            }s)`
          )
        }

        // The authenticated limiter counts per minute, so a fixed short backoff
        // never outlives the window. Wait as long as the server asks, capped so
        // a misreported header cannot stall the whole run.
        const retryAfter = Number(createResponse.headers.get('Retry-After') ?? '0')
        const waitSeconds =
          Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 65) : attempt + 1

        await new Promise((resolve) => {
          window.setTimeout(resolve, waitSeconds * 1000)
        })
      }

      if (!createResponse?.ok || !createPayload) {
        throw new Error('Failed to create placement request via API after retries')
      }

      if (
        'data' in createPayload &&
        createPayload.data &&
        typeof createPayload.data.id === 'number'
      ) {
        return createPayload.data.id
      }

      if ('id' in createPayload && typeof createPayload.id === 'number') {
        return createPayload.id
      }

      return null
    },
    {
      petId: options.petId,
      requestType: options.requestType,
      notes: options.notes ?? null,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate ? endDate.toISOString().slice(0, 10) : null,
    }
  )

  if (!requestId) {
    throw new Error('Placement request response did not include an id')
  }

  return requestId
}

export async function openRequestDetail(page: Page, requestId: number) {
  await gotoApp(page, `/requests/${String(requestId)}`)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
}

/** The status badge lives inside the page heading, next to the request type. */
export async function expectRequestStatus(page: Page, status: string) {
  await expect(page.locator('h1').getByText(status, { exact: true })).toBeVisible({
    timeout: 10000,
  })
}
