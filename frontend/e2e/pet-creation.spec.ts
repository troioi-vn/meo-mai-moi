import { test, expect } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { MailHogClient } from './utils/mailhog'
import {
  ensureCitySelected,
  openCreatePetPage,
  selectPetType,
  setBirthdayPrecisionUnknown,
} from './utils/pets'

// Test user credentials (from global setup)
const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

async function submitPetFormWithRetry(page: import('@playwright/test').Page) {
  let lastStatus = 0

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const createPetResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/api/pets')
    )
    await page.locator('form button[type="submit"]').click()

    const response = await createPetResponse
    lastStatus = response.status()

    if (response.ok()) {
      return response
    }

    if (response.status() !== 429 || attempt === 2) {
      return response
    }

    await page.waitForTimeout(2000 * (attempt + 1))
  }

  throw new Error(`Pet creation request unexpectedly exhausted retries with ${String(lastStatus)}`)
}

test.describe('Pet Creation', () => {
  // All tests here authenticate as the same user.
  // Run serially to avoid auth rate-limit flakiness.
  test.describe.configure({ mode: 'serial' })

  let mailhog: MailHogClient

  test.beforeEach(async () => {
    mailhog = new MailHogClient()
    await mailhog.clearMessages()
  })

  test('allows authenticated user to create a new pet', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    // Verify we're logged in and on the home page
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })

    await openCreatePetPage(page)

    // Generate unique pet name to avoid conflicts
    const petName = `Test Pet ${String(Date.now())}`

    // Fill out the pet creation form
    // Name (required)
    await page.locator('input#name').fill(petName)

    // Pet type is required
    await selectPetType(page, 'Cat')
    await setBirthdayPrecisionUnknown(page)

    // Birthday Precision (optional - keep default "unknown" for simplicity)

    // Country should already be selected as Vietnam (VN) by default
    await ensureCitySelected(page)

    // Submit the form
    const response = await submitPetFormWithRetry(page)

    if (!response.ok()) {
      const errorMessages = await page.locator('[data-testid="form-error"]').allTextContents()
      await page.screenshot({ path: `debug-submission-error-${String(Date.now())}.png` })

      throw new Error(
        `Pet creation request failed with ${String(response.status())}. Errors: ${errorMessages.join(', ')}`
      )
    }

    // Wait for successful creation and redirect to home page
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })

    // Creation should navigate away from the create page.
    await expect(page).not.toHaveURL(/\/pets\/create/)
  })

  test('validates required fields on pet creation', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    await openCreatePetPage(page)

    // Try to submit without filling required fields
    await page.locator('form button[type="submit"]').click()

    // Verify validation errors appear
    await expect(page.locator('text=/required|invalid/i').first()).toBeVisible()
  })

  test('allows pet creation with minimal required fields only', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    await openCreatePetPage(page)

    // Fill only the absolute minimum required fields
    const minimalPetName = `Minimal Pet ${String(Date.now())}`
    await page.locator('input#name').fill(minimalPetName)
    await selectPetType(page, 'Cat')
    await setBirthdayPrecisionUnknown(page)
    await ensureCitySelected(page)

    // Leave everything else as defaults (sex: not_specified, birthday: unknown)

    // Submit the form
    await page.locator('form button[type="submit"]').click()

    // Verify creation succeeded
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(pets\/\d+|pets)?$/, { timeout: 10000 })
    await expect(page).not.toHaveURL(/\/pets\/create/)
  })

  test('handles pet creation with different pet types', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    await openCreatePetPage(page)

    const dogName = `Test Dog ${String(Date.now())}`

    // Fill basic info
    await page.locator('input#name').fill(dogName)

    // Select pet type
    await selectPetType(page, 'Dog')
    await setBirthdayPrecisionUnknown(page)
    await ensureCitySelected(page)

    // Submit the form
    await page.locator('form button[type="submit"]').click()

    // Verify creation succeeded and shows as Dog
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(pets\/\d+|pets)?$/, { timeout: 10000 })
    await expect(page).not.toHaveURL(/\/pets\/create/)
  })

  test('prevents unauthenticated users from creating pets', async ({ page }) => {
    // Navigate directly to pet creation page without logging in
    await gotoApp(page, '/pets/create')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)

    // Verify we can't access the create pet page
    await expect(page.getByRole('heading', { name: /add pet|add a new pet/i })).not.toBeVisible()
  })
})
