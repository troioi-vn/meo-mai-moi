import { test, expect, type Locator, type Page } from '@playwright/test'
import { login } from './utils/app'
import { createPetViaApiAndOpenProfile, createTinyPngBuffer } from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

function sectionByTitle(page: Page, title: string, actionText: string) {
  return page
    .getByText(title, { exact: true })
    .locator(`xpath=ancestor::div[.//button[normalize-space()='${actionText}']][1]`)
}

async function openWeightEditMode(section: Locator) {
  await section.locator('button').first().click()
}

test.describe('Pet Health', () => {
  test.describe.configure({ mode: 'serial' })

  test('allows managing weight, vaccination, and medical records', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)
    await createPetViaApiAndOpenProfile(page, `Health Pet ${String(Date.now())}`)

    const weightSection = sectionByTitle(page, 'Weight History', 'Add New Weight Entry')

    await weightSection.getByRole('button', { name: 'Add New Weight Entry', exact: true }).click()

    const weightCreateForm = page.locator('form').last()
    await weightCreateForm.getByPlaceholder('e.g., 4.20').fill('4.20')
    await weightCreateForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Weight added')).toBeVisible({ timeout: 10000 })

    await openWeightEditMode(weightSection)

    const createdWeightItem = page.locator('li').filter({ hasText: '4.2 kg' }).first()
    await expect(createdWeightItem).toBeVisible({ timeout: 10000 })

    await createdWeightItem.getByRole('button').first().click()
    const weightEditForm = page.locator('form').last()
    await weightEditForm.getByPlaceholder('e.g., 4.20').fill('4.45')
    await weightEditForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Weight updated')).toBeVisible({ timeout: 10000 })

    const updatedWeightItem = page.locator('li').filter({ hasText: '4.45 kg' }).first()
    await expect(updatedWeightItem).toBeVisible({ timeout: 10000 })

    await updatedWeightItem.getByRole('button').nth(1).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText('Weight record deleted')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('li').filter({ hasText: '4.45 kg' })).toHaveCount(0)

    const vaccinationSection = sectionByTitle(page, 'Vaccinations', 'Add New Vaccination Entry')
    const vaccineName = `Rabies ${String(Date.now())}`
    const updatedVaccineName = `${vaccineName} Booster`

    await vaccinationSection
      .getByRole('button', { name: 'Add New Vaccination Entry', exact: true })
      .click()

    const vaccinationCreateForm = page.locator('form').last()
    await vaccinationCreateForm.getByPlaceholder('e.g. Rabies').fill(vaccineName)
    await vaccinationCreateForm.getByRole('button', { name: 'Save', exact: true }).click()

    const vaccinationItem = page.locator('li').filter({ hasText: vaccineName }).first()
    await expect(vaccinationItem).toBeVisible({ timeout: 10000 })

    await vaccinationItem.getByRole('button').last().click()
    const vaccinationEditForm = page.locator('form').last()
    await vaccinationEditForm.getByPlaceholder('e.g. Rabies').fill(updatedVaccineName)
    await vaccinationEditForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Vaccination updated')).toBeVisible({ timeout: 10000 })

    const updatedVaccinationItem = page
      .locator('li')
      .filter({ hasText: updatedVaccineName })
      .first()
    await expect(updatedVaccinationItem).toBeVisible({ timeout: 10000 })

    await updatedVaccinationItem.getByRole('button').last().click()
    const deleteVaccinationForm = page.locator('form').last()
    await deleteVaccinationForm.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText('Vaccination record deleted')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('li').filter({ hasText: updatedVaccineName })).toHaveCount(0)

    const medicalSection = sectionByTitle(page, 'Medical Records', 'Add Medical Record')
    const description = `Initial checkup ${String(Date.now())}`
    const updatedDescription = `${description} updated`

    await medicalSection.getByRole('button', { name: 'Add Medical Record', exact: true }).click()

    const medicalCreateForm = page.locator('form').last()
    await medicalCreateForm.getByPlaceholder('e.g., Annual checkup — all clear').fill(description)
    await medicalCreateForm.locator('input[type="file"]').setInputFiles({
      name: `medical-record-${String(Date.now())}.png`,
      mimeType: 'image/png',
      buffer: createTinyPngBuffer(),
    })
    await medicalCreateForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Medical record added')).toBeVisible({ timeout: 10000 })

    const medicalItem = page.locator('li').filter({ hasText: description }).first()
    await expect(medicalItem).toBeVisible({ timeout: 10000 })

    await medicalItem.getByRole('button').last().click()
    const medicalEditForm = page.locator('form').last()
    await medicalEditForm
      .getByPlaceholder('e.g., Annual checkup — all clear')
      .fill(updatedDescription)
    await medicalEditForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.getByText('Medical record updated')).toBeVisible({ timeout: 10000 })

    const updatedMedicalItem = page.locator('li').filter({ hasText: updatedDescription }).first()
    await expect(updatedMedicalItem).toBeVisible({ timeout: 10000 })

    await updatedMedicalItem.getByRole('button').last().click()
    const deleteMedicalForm = page.locator('form').last()
    await deleteMedicalForm.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByText('Medical record deleted')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('li').filter({ hasText: updatedDescription })).toHaveCount(0)
  })

  test('allows managing microchips', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)
    await createPetViaApiAndOpenProfile(page, `Chip Pet ${String(Date.now())}`)

    const microchipSection = sectionByTitle(page, 'Microchips', 'Add Microchip')
    const chipNumber = `98200012345${String(Date.now()).slice(-4)}`
    const issuer = 'HomeAgain'
    const updatedIssuer = 'AVID'

    await microchipSection.getByRole('button', { name: 'Add Microchip', exact: true }).click()

    const microchipCreateForm = page.locator('form').last()
    await microchipCreateForm.getByLabel('Chip number').fill(chipNumber)
    await microchipCreateForm.getByLabel('Issuer (optional)').fill(issuer)
    const createMicrochipResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/pets\/\d+\/microchips$/.test(response.url())
    )
    await microchipCreateForm.getByRole('button', { name: 'Save', exact: true }).click()
    const microchipResponse = await createMicrochipResponse

    if (!microchipResponse.ok()) {
      throw new Error(
        `Microchip create failed: ${String(microchipResponse.status())} ${await microchipResponse.text()}`
      )
    }

    const microchipItem = page.locator('li').filter({ hasText: chipNumber }).first()
    await expect(microchipItem).toBeVisible({ timeout: 10000 })
    await expect(microchipItem.getByText(`Issuer: ${issuer}`, { exact: true })).toBeVisible()

    await microchipItem.getByRole('button', { name: 'Edit', exact: true }).click()
    const microchipEditForm = page.locator('form').last()
    await microchipEditForm.getByLabel('Issuer (optional)').fill(updatedIssuer)
    await microchipEditForm.getByRole('button', { name: 'Save', exact: true }).click()

    const updatedMicrochipItem = page.locator('li').filter({ hasText: chipNumber }).first()
    await expect(
      updatedMicrochipItem.getByText(`Issuer: ${updatedIssuer}`, { exact: true })
    ).toBeVisible({
      timeout: 10000,
    })

    await updatedMicrochipItem.getByRole('button', { name: 'Delete', exact: true }).first().click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.locator('li').filter({ hasText: chipNumber })).toHaveCount(0)
  })
})
