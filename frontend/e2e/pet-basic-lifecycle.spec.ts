import { test, expect } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetAndGetProfilePath } from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Pet Basic Lifecycle', () => {
  // All tests here use the same account and should avoid parallel auth churn.
  test.describe.configure({ mode: 'serial' })

  test('allows editing a pet general info', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const timestamp = Date.now()
    const originalName = `Lifecycle Pet ${String(timestamp)}`
    const updatedName = `Lifecycle Pet Updated ${String(timestamp)}`
    const updatedDescription = `Updated description ${String(timestamp)}`

    const petProfilePath = await createPetAndGetProfilePath(page, originalName)

    await gotoApp(page, `${petProfilePath}?edit=general`)
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('data-state', 'active')

    await page.getByLabel('Name').fill(updatedName)
    await page.getByLabel('Description').fill(updatedDescription)
    await page.getByRole('button', { name: 'Update Pet', exact: true }).click()

    await expect(page.getByRole('heading', { name: updatedName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible()
  })

  test('allows deleting a pet from the status tab', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = `Delete Lifecycle Pet ${String(Date.now())}`
    const petProfilePath = await createPetAndGetProfilePath(page, petName)

    await gotoApp(page, `${petProfilePath}?edit=status`)
    await expect(page.getByRole('tab', { name: 'Status' })).toHaveAttribute('data-state', 'active')

    await page.getByRole('button', { name: 'Remove pet', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm remove', exact: true }).click()

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: petName, exact: true })).toHaveCount(0)
  })
})
