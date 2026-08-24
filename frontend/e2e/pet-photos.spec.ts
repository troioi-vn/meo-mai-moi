import { test, expect, type Locator, type Page } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetAndGetProfilePath, createSquarePngBuffer } from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

async function uploadPetPhoto(page: Page, editor: Locator, fileName: string) {
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && /\/api\/pets\/\d+\/photos$/.test(response.url())
  )
  // A successful upload invalidates the pet queries, and the refetch remounts
  // the photo component — which wipes the state behind a cropper opened before
  // it lands. Wait it out so a following upload is not dismissed mid-crop.
  const petRefetch = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && /\/api\/pets\/\d+(\?.*)?$/.test(response.url())
  )
  await editor.getByRole('button', { name: 'Upload Photo', exact: true }).click()
  await editor.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: createSquarePngBuffer(),
  })

  // Choosing a file now opens the cropper; nothing is sent until it is applied.
  // Addressed by name rather than by `.last()`, which drifts to the photo
  // gallery dialog once that has been opened.
  const cropper = page.getByRole('dialog', { name: 'Adjust photo' })
  await expect(cropper).toBeVisible({ timeout: 10000 })

  // Apply stays disabled until react-easy-crop reports a crop area.
  const applyCrop = cropper.getByRole('button', { name: 'Apply', exact: true })
  await expect(applyCrop).toBeEnabled({ timeout: 15000 })
  await applyCrop.click()

  const response = await uploadResponse
  expect(response.ok()).toBeTruthy()
  await petRefetch

  await expect(editor.getByRole('button', { name: 'Upload Photo', exact: true })).toBeEnabled({
    timeout: 15000,
  })

  // A finished upload keeps re-rendering the photo component for a moment
  // afterwards, and one of those renders unmounts an open cropper — so a second
  // upload started immediately loses its crop dialog and never sends. No UI or
  // network signal marks the end of that tail, hence the flat settle. Worth
  // fixing in the app; until then, do not remove this.
  await page.waitForTimeout(3000)
}

test.describe('Pet Photos', () => {
  // Two uploads now go through the crop dialog on top of the avatar switching,
  // which does not fit the default 30s budget.
  test.describe.configure({ mode: 'serial', timeout: 90 * 1000 })

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

    // Thumbnails are labelled by position now ("Show photo 2 of 2"), not "Pet photo".
    const thumbnailButtons = dialog.getByRole('button', { name: /^Show photo \d+ of \d+$/ })
    await expect(thumbnailButtons).toHaveCount(2)
    await thumbnailButtons.nth(1).click()

    await expect(dialog.getByRole('button', { name: 'Set as Avatar', exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Set as Avatar', exact: true }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await page.getByAltText(petName).click()
    await expect(dialog).toBeVisible({ timeout: 10000 })

    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(photoCountBadge).toHaveCount(0)
  })
})
