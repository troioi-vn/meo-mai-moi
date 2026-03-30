import { test, expect } from '@playwright/test'
import { gotoApp, login } from './utils/app'

const TEST_USER = { email: 'user1@catarchy.space', password: 'password' }

test.describe('Navigation & Routing', () => {
  test('shows 404 page for unknown routes', async ({ page }) => {
    await gotoApp(page, '/this-route-does-not-exist-at-all')

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByText(/page.*not found/i)).toBeVisible()

    // "Go to Homepage" link navigates back
    const homeLink = page.getByRole('link', { name: /homepage/i })
    await expect(homeLink).toBeVisible()
    await homeLink.click()
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
  })

  test('redirects unauthenticated user from protected routes to /login', async ({ page }) => {
    await gotoApp(page, '/settings/account')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('redirects authenticated user away from /login', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    // Now navigate to /login — should bounce back to home
    await page.goto('/login')
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })
  })

  test('login failure shows error message', async ({ page }) => {
    await gotoApp(page, '/login')
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()

    await page.getByLabel('Email', { exact: true }).fill('wrong@example.com')

    // Support both 2-step and single-step login UI
    const nextButton = page.getByRole('button', { name: /next/i })
    if (await nextButton.isVisible()) {
      await nextButton.click()
    }

    await page.getByLabel('Password', { exact: true }).fill('wrongpassword')
    await page.locator('form button[type="submit"]').click()

    // Should show an error and stay on login
    await expect(
      page.locator('[role="alert"], .text-destructive, [data-slot="form-message"]').first()
    ).toBeVisible({
      timeout: 10000,
    })
    await expect(page).toHaveURL(/\/login/)
  })
})
