import { expect, test } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetViaApiAndOpenProfile } from './utils/pets'
import { petName as demoPetName } from './utils/demo-data'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Placement requests', () => {
  test('allows an owner to create and discover a permanent placement request', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = demoPetName()
    const notes = `Permanent home needed for ${petName}`
    const { petId } = await createPetViaApiAndOpenProfile(page, petName)

    await page.getByRole('button', { name: 'Create Request', exact: true }).click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog.getByText('Create Placement Request', { exact: true })).toBeVisible()

    await dialog.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Permanent', exact: true }).click()
    await dialog.getByLabel('Notes', { exact: true }).fill(notes)

    const pickupDate = new Date()
    pickupDate.setDate(pickupDate.getDate() + 7)
    await dialog.getByLabel('Pick-up date', { exact: true }).click()
    await page
      .locator('[data-slot="calendar"]')
      .locator(`[data-day="${pickupDate.toLocaleDateString('en-US')}"]`)
      .click()

    const publicProfileConsent = dialog.getByLabel(
      "I understand the pet's profile will become publicly visible."
    )
    const placementTermsConsent = dialog.getByLabel(/^I confirm I am authorized to place this pet/)
    await publicProfileConsent.click()
    await placementTermsConsent.click()
    await expect(publicProfileConsent).toBeChecked()
    await expect(placementTermsConsent).toBeChecked()

    const createResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().endsWith('/api/placement-requests')
    )
    await dialog.getByRole('button', { name: 'Create Request', exact: true }).click()
    const response = await createResponse
    expect(response.ok()).toBeTruthy()

    const payload = (await response.json()) as { data?: { id?: number }; id?: number }
    const requestId = payload.data?.id ?? payload.id
    expect(requestId).toBeTruthy()
    await expect(page).toHaveURL(`/requests/${String(requestId)}`, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Permanent/, level: 1 })).toBeVisible()
    await expect(page.getByText(notes, { exact: true })).toBeVisible()

    await gotoApp(page, '/requests')
    const requestCard = page.getByTestId(`pet-card-root-${String(petId)}`)
    await expect(requestCard).toBeVisible({ timeout: 10000 })
    await expect(
      requestCard.getByRole('link', { name: petName, exact: true }).first()
    ).toBeVisible()
    await expect(requestCard.getByText('PERMANENT', { exact: true })).toBeVisible()
  })
})
