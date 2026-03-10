import { expect, type Page } from '@playwright/test'

export async function gotoApp(page: Page, urlPath: string) {
  await page.goto(urlPath, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#root')).toBeVisible()
}

export async function submitLoginForm(page: Page, email: string, password: string) {
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill(email)

  // Support both old 2-step and current single-step login UIs.
  const nextButton = page.getByRole('button', { name: /next/i })
  if (await nextButton.isVisible()) {
    await nextButton.click()
  }

  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.locator('form button[type="submit"]').click()
}

export async function login(page: Page, email: string, password: string) {
  const performLogin = async () => {
    await gotoApp(page, '/login')

    await submitLoginForm(page, email, password)

    // First-level signal: login flow returned to app shell.
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })
  }

  await performLogin()

  // Second-level signal: authenticated navbar is present.
  const userMenuTrigger = page.locator('[data-slot="dropdown-menu-trigger"]').first()
  if (!(await userMenuTrigger.isVisible())) {
    // One retry helps when cookie/session propagation is slow.
    await performLogin()
  }
  await expect(userMenuTrigger).toBeVisible({ timeout: 10000 })
}

export async function openUserMenu(page: Page) {
  // Target the actual dropdown trigger, not the nested avatar image.
  await page.locator('[data-slot="dropdown-menu-trigger"]').first().click()
  await expect(page.getByRole('menu')).toBeVisible()
}

export async function logout(page: Page) {
  await openUserMenu(page)
  await page.getByRole('menuitem', { name: /logout|log out|sign out/i }).click()
  await page.getByRole('button', { name: /logout|log out|sign out/i }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
}
