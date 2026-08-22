import { test, expect } from '@playwright/test'
import { gotoApp, login, openUserMenu } from './utils/app'

test('account creation page loads and displays form', async ({ page }) => {
  await gotoApp(page, '/register')
  await expect(page.getByRole('heading', { name: 'Create an account', exact: true })).toBeVisible()

  // Check that all required form fields are present
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Confirm Password', { exact: true })).toBeVisible()
  await expect(
    page.locator('form').getByRole('button', { name: 'Create account', exact: true })
  ).toBeVisible()
})

test('sign in with an existing user and sign out', async ({ page }) => {
  // Use seeded test user (user1@catarchy.space / password)
  const existingUser = {
    email: 'user1@catarchy.space',
    password: 'password',
  }

  await login(page, existingUser.email, existingUser.password)

  // Expect redirect to home
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })

  // Open the user menu and sign out.
  await openUserMenu(page)
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()

  // Confirm sign-out in the dialog.
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()

  // After logout, app navigates to /login
  await expect(page).toHaveURL(/\/login/)
})
