import { test, expect } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { MailHogClient } from './utils/mailhog'

// Test user credentials (from global setup)
const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Pet Creation', () => {
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

    // Navigate to pet creation page
    await gotoApp(page, '/pets/create')

    // Verify we're on the create pet page
    await expect(page.getByRole('heading', { name: /add a new pet/i })).toBeVisible()

    // Generate unique pet name to avoid conflicts
    const petName = `Test Pet ${Date.now()}`

    // Fill out the pet creation form
    // Name (required)
    await page.getByLabel('Name').fill(petName)

    // Sex (optional - defaults to "not_specified")
    await page.getByLabel('Sex').selectOption('female')

    // Birthday Precision (optional - keep default "unknown" for simplicity)

    // Country should already be selected as Vietnam (VN) by default

    // City selection (required) - click on the city selector
    await page.getByText('Select city').click()

    // Type in the search input
    await page.getByPlaceholder('Search cities...').fill('Test City')

    // Click the create button
    await page.getByText('Create: "Test City"').click()

    // Verify the city was created and selected
    await expect(page.getByText('Test City')).toBeVisible()

    // Submit the form
    await page.getByRole('button', { name: 'Create Pet' }).click()

    // Wait a moment for form submission
    await page.waitForTimeout(2000)

    // Check if we're still on the create page (which would indicate an error)
    const currentUrl = page.url()
    if (currentUrl.includes('/pets/create')) {
      // Check for error messages
      const errorMessages = await page.locator('[data-testid="form-error"]').allTextContents()
      console.log('Form errors:', errorMessages)

      // Take a screenshot for debugging
      await page.screenshot({ path: `debug-submission-error-${Date.now()}.png` })

      throw new Error(
        `Form submission failed. Current URL: ${currentUrl}. Errors: ${errorMessages.join(', ')}`
      )
    }

    // Wait for successful creation and redirect to home page
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })

    // Verify we can see the pet was created - it should appear on the home page
    await expect(page.getByText(petName)).toBeVisible()
  })

  test('validates required fields on pet creation', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    // Navigate to pet creation page (using direct navigation to preserve session)
    await page.goto('/pets/create', { waitUntil: 'domcontentloaded' })

    await expect(page.locator('#root')).toBeVisible()

    // Verify we're on the create pet page
    await expect(page.getByRole('heading', { name: /add a new pet/i })).toBeVisible()

    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Create Pet' }).click()

    // Verify validation errors appear
    await expect(page.getByText('Name is required')).toBeVisible()
    await expect(page.getByText('City is required')).toBeVisible()

    // Fill name and try again
    await page.getByLabel('Name').fill('Test Validation Pet')

    // Select city
    const citySelect = page.locator('[data-testid="city-select"]')
    await citySelect.click()
    await page.getByText('Hanoi').click()

    // Submit again
    await page.getByRole('button', { name: 'Create Pet' }).click()

    // Should succeed now
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(pets\/\d+|pets)$/, { timeout: 10000 })
    await expect(page.getByText('Test Validation Pet')).toBeVisible()
  })

  test('allows pet creation with minimal required fields only', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    // Navigate to pet creation page (using direct navigation to preserve session)
    await page.goto('/pets/create', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#root')).toBeVisible()

    // Verify we're on the create pet page
    await expect(page.getByRole('heading', { name: /add a new pet/i })).toBeVisible()

    // Fill only the absolute minimum required fields
    const minimalPetName = `Minimal Pet ${Date.now()}`
    await page.getByLabel('Name').fill(minimalPetName)

    // Select city (required)
    const citySelect = page.locator('[data-testid="city-select"]')
    await citySelect.click()
    await page.getByText('Hanoi').click()

    // Leave everything else as defaults (sex: not_specified, birthday: unknown)

    // Submit the form
    await page.getByRole('button', { name: 'Create Pet' }).click()

    // Verify creation succeeded
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(pets\/\d+|pets)$/, { timeout: 10000 })
    await expect(page.getByText(minimalPetName)).toBeVisible()
  })

  test('handles pet creation with different pet types', async ({ page }) => {
    // Login with test user
    await login(page, TEST_USER.email, TEST_USER.password)

    // Navigate to pet creation page (using direct navigation to preserve session)
    await page.goto('/pets/create', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#root')).toBeVisible()

    // Verify we're on the create pet page
    await expect(page.getByRole('heading', { name: /add a new pet/i })).toBeVisible()

    const dogName = `Test Dog ${Date.now()}`

    // Fill basic info
    await page.getByLabel('Name').fill(dogName)

    // Change pet type to Dog
    await page.getByRole('button', { name: 'Cat' }).click()
    await page.getByRole('option', { name: 'Dog' }).click()

    // Select city
    const citySelect = page.locator('[data-testid="city-select"]')
    await citySelect.click()
    await page.getByText('Hanoi').click()

    // Submit the form
    await page.getByRole('button', { name: 'Create Pet' }).click()

    // Verify creation succeeded and shows as Dog
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/(pets\/\d+|pets)$/, { timeout: 10000 })
    await expect(page.getByText(dogName)).toBeVisible()
  })

  test('prevents unauthenticated users from creating pets', async ({ page }) => {
    // Navigate directly to pet creation page without logging in
    await gotoApp(page, '/pets/create')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/)

    // Verify we can't access the create pet page
    await expect(page.getByRole('heading', { name: /add a new pet/i })).not.toBeVisible()
  })
})
