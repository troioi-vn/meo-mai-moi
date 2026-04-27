import { test, expect } from '@playwright/test'
import { MailHogClient } from './utils/mailhog'
import { gotoApp } from './utils/app'

test.describe('Registration with Email Verification', () => {
  let mailhog: MailHogClient

  test.beforeEach(async () => {
    mailhog = new MailHogClient()
    // Clear any existing emails before each test
    await mailhog.clearMessages()
  })

  test('register page displays correctly', async ({ page }) => {
    await gotoApp(page, '/register')
    await expect(page.getByRole('heading', { name: /register|create.*account/i })).toBeVisible()

    // Check that all form fields are present
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirm Password', { exact: true })).toBeVisible()
    await expect(
      page.locator('form').getByRole('button', { name: 'Register', exact: true })
    ).toBeVisible()
  })

  test('registers a new user, receives verification email, and enters the app', async ({
    page,
  }) => {
    const timestamp = Date.now()
    const user = {
      name: `E2E User ${String(timestamp)}`,
      email: `e2e-registration-${String(timestamp)}@example.com`,
      password: `V3rify!${String(timestamp)}Aa`,
    }

    await gotoApp(page, '/register')
    await expect(page.getByRole('heading', { name: /register|create.*account/i })).toBeVisible()

    await page.getByLabel('Name').fill(user.name)
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByLabel('Confirm Password', { exact: true }).fill(user.password)
    await page.locator('form').getByRole('button', { name: 'Register', exact: true }).click()

    await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(user.email, { exact: true }).first()).toBeVisible()

    const email = await mailhog.waitForEmail(user.email, {
      timeout: 30000,
      subject: 'Verify',
    })
    const verificationUrl = mailhog.extractVerificationUrl(email)

    if (!verificationUrl) {
      throw new Error(`Could not extract verification URL from email ${email.ID}`)
    }

    await page.goto(verificationUrl, { waitUntil: 'domcontentloaded' })

    // Verification via the backend web route creates the SPA session and returns to home.
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(?:\?.*)?$/, { timeout: 10000 })
    await expect(page.locator('[data-slot="dropdown-menu-trigger"]').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('email verification page loads when accessed directly', async ({ page }) => {
    // Test accessing email verification page directly
    await gotoApp(page, '/email/verify')

    // Without params, current UI renders an explicit verification error state.
    await expect(page.getByRole('heading', { name: /verification failed|verify/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /back to login/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /register again/i })).toBeVisible()
  })

  test('handles invalid verification link', async ({ page }) => {
    // Try to visit an invalid verification URL
    await page.goto('/email/verify/999/invalid-signature?expires=9999999999&signature=invalid')

    // Should show error or redirect to verification page
    await expect(
      page.getByText(/invalid|expired|error/i).or(page.getByRole('heading', { name: /verify/i }))
    ).toBeVisible({ timeout: 5000 })
  })

  test('protected routes redirect unauthenticated users', async ({ page }) => {
    // Try to access protected route without being logged in
    await page.goto('/pets/create')

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // Should show login form
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
  })
})
