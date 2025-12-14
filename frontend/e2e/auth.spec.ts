import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const TEST_USER = {
  name: 'E2E Auth Test User',
  email: 'e2e-auth-test@example.com',
  password: 'TestPassword123!',
}

async function goto(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible()
}

async function login(page: Page, email: string, password: string) {
  await goto(page, '/login')
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: /next/i }).click()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click()
}

// Test that register page loads correctly
test('register page loads and displays form', async ({ page }) => {
  await goto(page, '/register')
  await expect(page.getByRole('heading', { name: /register|create.*account/i })).toBeVisible()
  
  // Check that all required form fields are present
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Confirm Password', { exact: true })).toBeVisible()
  await expect(page.locator('form').getByRole('button', { name: 'Register', exact: true })).toBeVisible()
})

test('login with existing user and logout', async ({ page }) => {
  // Use seeded test user (user1@catarchy.space / password)
  const existingUser = {
    email: 'user1@catarchy.space',
    password: 'password'
  }

  await login(page, existingUser.email, existingUser.password)

  // Expect redirect to home
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })

  // Open user menu and logout
  await page.getByRole('img').first().click()
  await page.getByRole('menuitem', { name: /log out/i }).click()

  // Confirm logout in the dialog
  await page.getByRole('button', { name: /log out/i }).click()

  // After logout, app navigates to /login
  await expect(page).toHaveURL(/\/login/)
})
