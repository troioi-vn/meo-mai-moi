import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { gotoApp, login } from './app'
import { createPetViaApi } from './pets'
import { petName as demoPetName } from './demo-data'

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

/**
 * Deletes a placement request as its owner.
 *
 * The development deployment is a public demo, and open placement requests are
 * one of its most visible pages. A suite that creates requests and walks away
 * leaves them on that page until the next reseed, looking like debris beside
 * the curated ones. Specs that create a request should remove it again.
 *
 * Returns true when the request is gone, false when it could not be removed;
 * callers in cleanup should not fail a passing test over tidying up.
 */
export async function deletePlacementRequestViaApi(
  page: Page,
  requestId: number
): Promise<{ ok: boolean; status: number }> {
  return page.evaluate(async (id: number) => {
    const xsrfCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.split('=')[1]

    const response = await fetch(`/api/placement-requests/${String(id)}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(xsrfCookie ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie) } : {}),
      },
      credentials: 'include',
    })

    return { ok: response.ok || response.status === 404, status: response.status }
  }, requestId)
}

/**
 * Creates a pet and lists it, returning everything a spec needs to drive it.
 *
 * The dev deployment is a public demo and placement requests are one of its
 * public surfaces, so what this leaves behind is what visitors read. `label`
 * stays in the notes, where it keeps its diagnostic value without becoming the
 * headline.
 */
export async function createPetWithRequest(
  page: Page,
  requestType: PlacementRequestType,
  label: string
) {
  const petName = demoPetName()
  const { petId } = await createPetViaApi(page, petName)
  const requestId = await createPlacementRequestViaApi(page, {
    petId,
    requestType,
    notes: `E2E ${requestType} for ${petName} (${label})`,
    endDateOffsetDays: requestType === 'permanent' ? undefined : 14,
  })

  return { petId, petName, requestId }
}

/** Applies to an open request as a helper, and waits for the pending state. */
export async function respondAsHelper(page: Page, requestId: number, message: string) {
  await openRequestDetail(page, requestId)
  await expect(page.getByText('Your Response', { exact: true })).toBeVisible({ timeout: 10000 })

  const sendResponse = page.getByRole('button', { name: 'Send Response' })
  await expect(sendResponse).toBeEnabled({ timeout: 10000 })
  await page
    .getByPlaceholder("Introduce yourself and explain why you'd like to help...")
    .fill(message)

  const responseCreated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/placement-requests\/\d+\/responses$/.test(response.url())
  )
  await sendResponse.click()
  expect((await responseCreated).ok()).toBeTruthy()

  await expect(page.getByText('Pending Review', { exact: true })).toBeVisible({ timeout: 10000 })
}

/**
 * Accepts or rejects a response from the owner side of the request.
 *
 * Deliberately not named for the owner: the page driving this may belong to a
 * group volunteer who has never owned the pet. `viewer_role` is what decides
 * whether these controls render, and a group member reads as `owner` there.
 */
export async function decideOnResponse(
  page: Page,
  requestId: number,
  helperName: string,
  decision: 'Accept' | 'Reject'
) {
  await openRequestDetail(page, requestId)
  await expect(page.getByRole('button', { name: helperName })).toBeVisible({ timeout: 10000 })

  const decided = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new RegExp(`/api/placement-responses/\\d+/${decision.toLowerCase()}$`).test(response.url())
  )
  await page.getByRole('button', { name: decision, exact: true }).click()
  expect((await decided).ok()).toBeTruthy()
}

/** Confirms the handover as the accepted helper, which is what moves the pet. */
export async function confirmHandoverAsHelper(page: Page, requestId: number) {
  await openRequestDetail(page, requestId)
  await expect(page.getByText('Your response was accepted!', { exact: true })).toBeVisible({
    timeout: 10000,
  })

  const confirmed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/transfer-requests\/\d+\/confirm$/.test(response.url())
  )
  await page.getByRole('button', { name: 'Confirm Handover' }).click()
  expect((await confirmed).ok()).toBeTruthy()
}

/** Closes a temporary placement from the owner side by marking the pet returned. */
export async function finalizeReturn(page: Page, requestId: number) {
  await openRequestDetail(page, requestId)

  await page.getByRole('button', { name: 'Pet is Returned' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible({ timeout: 10000 })

  const finalized = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/placement-requests\/\d+\/finalize$/.test(response.url())
  )
  await dialog.getByRole('button', { name: 'Confirm Return' }).click()
  expect((await finalized).ok()).toBeTruthy()
}

/**
 * Creates a placement request through the dialog on a pet's profile.
 *
 * The API fixture above is faster and is what most specs want. This one exists
 * because the create button is itself a permission boundary — it renders on
 * `can_manage_placements`, which covers group volunteers as well as owners —
 * and because the dialog's two consent checkboxes are part of the promise the
 * product makes before a pet goes on a public page.
 *
 * Assumes the pet's profile is already open. Returns the new request's id.
 */
export async function createRequestViaDialog(
  page: Page,
  options: { typeLabel: string; notes: string; pickupInDays?: number }
): Promise<number> {
  await page.getByRole('button', { name: 'Create Request', exact: true }).click()

  const dialog = page.getByRole('dialog').last()
  await expect(dialog.getByText('Create Placement Request', { exact: true })).toBeVisible()

  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: options.typeLabel, exact: true }).click()
  await dialog.getByLabel('Notes', { exact: true }).fill(options.notes)

  const pickupDate = new Date()
  pickupDate.setDate(pickupDate.getDate() + (options.pickupInDays ?? 7))
  await dialog.getByLabel('Pick-up date', { exact: true }).click()
  await page
    .locator('[data-slot="calendar"]')
    .locator(`[data-day="${pickupDate.toLocaleDateString('en-US')}"]`)
    .click()

  const publicProfileConsent = dialog.getByLabel(
    "I understand the pet's profile will become publicly visible."
  )
  const placementTermsConsent = dialog.getByLabel(/^I confirm I am authorized to place this pet/)
  await publicProfileConsent.click()
  await placementTermsConsent.click()
  await expect(publicProfileConsent).toBeChecked()
  await expect(placementTermsConsent).toBeChecked()

  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().endsWith('/api/placement-requests')
  )
  await dialog.getByRole('button', { name: 'Create Request', exact: true }).click()

  const response = await created
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as { data?: { id?: number }; id?: number }
  const requestId = payload.data?.id ?? payload.id
  if (!requestId) {
    throw new Error('Placement request dialog response did not include an id')
  }

  return requestId
}
