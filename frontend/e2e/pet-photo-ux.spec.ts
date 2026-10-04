import { test, expect, type Page } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetAndGetProfilePath, clearPersistedQueryCache } from './utils/pets'

test.use({ serviceWorkers: 'block' })

test('keeps portrait cropping and photo galleries usable on small screens', async ({ page }) => {
  test.setTimeout(90000)
  await login(page, 'demo@catarchy.space', 'password')
  const name = `Photo layout ${String(Date.now())}`
  const profilePath = await createPetAndGetProfilePath(page, name)
  const origin = new URL(page.url()).origin
  const apiPath = `/api${profilePath}`

  try {
    await page.setViewportSize({ width: 393, height: 659 })
    await gotoApp(page, `${profilePath}?edit=general`)
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 1800
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')
      ctx.fillStyle = '#68a3cb'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/png')
    })
    await page.locator('input[type="file"]').setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: Buffer.from(dataUrl.substring(dataUrl.indexOf(',') + 1), 'base64'),
    })
    const cropper = page.getByRole('dialog', { name: 'Adjust photo' })
    await expect(cropper.getByRole('button', { name: 'Apply', exact: true })).toBeEnabled()
    const image = cropper.locator('img')
    const cropArea = cropper.locator('div.bg-black').first()
    const imageBounds = await image.boundingBox()
    const areaBounds = await cropArea.boundingBox()
    if (!imageBounds || !areaBounds) throw new Error('Crop image bounds unavailable')
    expect(imageBounds.y).toBeGreaterThanOrEqual(areaBounds.y)
    expect(imageBounds.y + imageBounds.height).toBeLessThanOrEqual(areaBounds.y + areaBounds.height)
    expect(imageBounds.width / imageBounds.height).toBeCloseTo(1 / 3, 2)
    await cropper.getByRole('button', { name: 'Cancel', exact: true }).click()

    const original = (await (
      await page.request.get(apiPath, {
        headers: { Accept: 'application/json', Origin: origin, Referer: page.url() },
      })
    ).json()) as { success: boolean; data: Record<string, unknown> }
    await page.route(`**${apiPath}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        json: {
          ...original,
          data: {
            ...original.data,
            photo_url: dataUrl,
            photos: Array.from({ length: 8 }, (_, index) => ({
              id: index + 1,
              url: dataUrl,
              is_primary: index === 0,
            })),
          },
        },
      })
    })
    await clearPersistedQueryCache(page)
    await gotoApp(page, profilePath)
    const openGallery = page.getByRole('button', { name: `View photos of ${name}` })
    await openGallery.focus()
    await page.keyboard.press('Enter')
    const gallery = page.getByRole('dialog')
    await expect(gallery).toBeVisible()
    await page.mouse.move(0, 0)
    await expect(gallery.getByRole('button', { name: 'Next slide' })).toHaveCSS('opacity', '1')
    await expect(gallery.getByRole('button', { name: 'Previous slide' })).toHaveCSS('opacity', '1')
    await expect(gallery.getByRole('button', { name: 'Close', exact: true })).toHaveCSS(
      'color',
      'rgb(255, 255, 255)'
    )
    const firstThumb = gallery.getByRole('button', { name: 'Show photo 1 of 8', exact: true })
    const stripBounds = await firstThumb.locator('..').boundingBox()
    const firstBounds = await firstThumb.boundingBox()
    if (!stripBounds || !firstBounds) throw new Error('Thumbnail bounds unavailable')
    expect(firstBounds.x).toBeGreaterThanOrEqual(stripBounds.x)
    await gallery.getByRole('button', { name: 'Show photo 8 of 8', exact: true }).click()
    await expect(
      gallery.getByRole('button', { name: 'Show photo 8 of 8', exact: true })
    ).toHaveAttribute('aria-current', 'true')
    await gallery.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(gallery).not.toBeVisible()
  } finally {
    await deleteTestPet(page, apiPath, origin)
  }
})

async function deleteTestPet(page: Page, apiPath: string, origin: string) {
  const cookies = await page.context().cookies()
  const token = cookies.find((cookie) => cookie.name === 'XSRF-TOKEN')
  if (!token) throw new Error('CSRF cookie unavailable for cleanup')
  const response = await page.request.delete(apiPath, {
    headers: {
      Accept: 'application/json',
      Origin: origin,
      Referer: page.url(),
      'X-XSRF-TOKEN': decodeURIComponent(token.value),
    },
  })
  expect(response.status()).toBe(204)
}
