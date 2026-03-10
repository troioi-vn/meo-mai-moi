import { test, expect, type Locator, type Page } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetAndGetProfilePath, createTinyPngBuffer } from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

async function uploadPetPhoto(page: Page, editor: Locator, fileName: string) {
  await editor.getByRole('button', { name: 'Upload Photo', exact: true }).click()
  await editor.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: createTinyPngBuffer(),
  })
  await expect(page.getByText('Photo uploaded successfully')).toBeVisible({ timeout: 10000 })
}

test.describe('Pet Photos', () => {
  test.describe.configure({ mode: 'serial' })

  test('allows uploading, changing avatar, and deleting pet photos', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const timestamp = Date.now()
    const petName = `Photo Pet ${String(timestamp)}`
    const petProfilePath = await createPetAndGetProfilePath(page, petName)

    await gotoApp(page, `${petProfilePath}?edit=general`)
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('data-state', 'active')

    const editor = page.locator('form')

    await uploadPetPhoto(page, editor, `pet-photo-primary-${String(timestamp)}.png`)
    await uploadPetPhoto(page, editor, `pet-photo-gallery-${String(timestamp)}.png`)

    await page.getByRole('button', { name: 'Cancel', exact: true }).click()

    const photoCountBadge = page.getByLabel('2 photos')
    await expect(photoCountBadge).toBeVisible({ timeout: 10000 })

    await page.getByAltText(petName).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByRole('button', { name: 'Current Avatar', exact: true })).toBeVisible()

    const thumbnailButtons = dialog.getByRole('button', { name: 'Pet photo', exact: true })
    await expect(thumbnailButtons).toHaveCount(2)
    await thumbnailButtons.nth(1).click()

    await expect(dialog.getByRole('button', { name: 'Set as Avatar', exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Set as Avatar', exact: true }).click()
    await expect(page.getByText('Avatar updated successfully')).toBeVisible({ timeout: 10000 })
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await page.getByAltText(petName).click()
    await expect(dialog).toBeVisible({ timeout: 10000 })

    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByText('Photo deleted successfully')).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(photoCountBadge).toHaveCount(0)
  })
})
