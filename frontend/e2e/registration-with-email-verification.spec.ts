import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { MailHogClient } from './utils/mailhog'

const TEST_USER = {
  name: 'E2E Email Verification Test User',
  email: 'e2e-email-test@example.com',
  password: 'TestPassword123!',
}

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible()
}

test.describe('Registration with Email Verification', () => {
  let mailhog: MailHogClient

  test.beforeEach(async () => {
    mailhog = new MailHogClient()
    // Clear any existing emails before each test
    await mailhog.clearMessages()
  })

  test('register page displays correctly', async ({ page }) => {
    await goto(page, '/register')
    await expect(page.getByRole('heading', { name: /register|create.*account/i })).toBeVisible()

    // Check that all form fields are present
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirm Password', { exact: true })).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  })

  test('email verification page loads when accessed directly', async ({ page }) => {
    // Test accessing email verification page directly
    await goto(page, '/email/verify')
    
    // Should show some kind of verification interface or redirect to login
    const hasVerificationContent = await page.getByText(/verify.*email|email.*verification/i).first().isVisible()
    const isLoginPage = await page.getByRole('heading', { name: /login/i }).isVisible()
    
    // Either should show verification content or redirect to login
    expect(hasVerificationContent || isLoginPage).toBeTruthy()
  })

  test('handles invalid verification link', async ({ page }) => {
    // Try to visit an invalid verification URL
    await page.goto('/email/verify/999/invalid-signature?expires=9999999999&signature=invalid')
    
    // Should show error or redirect to verification page
    await expect(
      page.getByText(/invalid|expired|error/i).or(
        page.getByRole('heading', { name: /verify/i })
      )
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