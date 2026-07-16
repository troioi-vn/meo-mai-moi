import { expect, test } from '@playwright/test'
import { gotoApp, login } from './utils/app'

const DEMO_USER = {
  email: 'demo@catarchy.space',
  password: 'password',
}

test.describe('Finances', () => {
  test('opens the seeded workspace and creates an expense', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password)
    await gotoApp(page, '/finance')

    await expect(page.getByRole('heading', { name: 'Finances', level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('Catarchy Rescue', { exact: true })).toBeVisible()

    await page.getByRole('tab', { name: 'Transactions', exact: true }).click()
    await expect(page).toHaveURL(/\/finance\/\d+\/transactions$/, { timeout: 10000 })
    await expect(page.getByText('Wellness visit and medicine', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Add transaction', exact: true }).click()
    const dialog = page.getByRole('dialog').last()
    const description = `E2E care expense ${String(Date.now())}`
    await dialog.locator('input[inputmode="decimal"]').fill('125000')
    await dialog.locator('textarea').fill(description)

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/ledgers\/\d+\/transactions$/.test(response.url())
    )
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    expect((await createResponse).ok()).toBeTruthy()

    await expect(page.getByText(description, { exact: true })).toBeVisible({ timeout: 10000 })
  })
})
