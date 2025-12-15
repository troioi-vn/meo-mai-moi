import { expect, type Page } from '@playwright/test'

export async function gotoApp(page: Page, urlPath: string) {
  await page.goto(urlPath, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible()
}

export async function login(page: Page, email: string, password: string) {
  await gotoApp(page, '/login')

  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: /next/i }).click()

  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click()
}

export async function openUserMenu(page: Page) {
  // App currently renders the user menu trigger as the first avatar image.
  // If this becomes flaky, prefer adding a dedicated aria-label/test-id in the UI.
  await page.getByRole('img').first().click()
}
