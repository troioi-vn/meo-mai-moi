import { expect, test, type Page } from '@playwright/test'
import { extractText, getDocumentProxy } from 'unpdf'

// The PWA service worker answers mocked image URLs itself after a reload,
// bypassing page.route. Same opt-out as pet-photo-ux.spec.ts.
test.use({ serviceWorkers: 'block' })

// Run against a deployment built from this checkout. No application data is
// written: fixtures exercise the real route, CSS, fonts and QR implementation.
// PDFs are read with pdf.js (unpdf) so the suite needs no host tools; the CI
// Playwright image has no Poppler.
async function readPdf(pdf: Buffer) {
  const doc = await getDocumentProxy(new Uint8Array(pdf))
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = (await doc.getPage(1)).view
  const { text } = await extractText(doc, { mergePages: true })
  const toMm = (points: number) => (points * 25.4) / 72
  return { pages: doc.numPages, widthMm: toMm(x1 - x0), heightMm: toMm(y1 - y0), text }
}

const actions = {
  can_print_poster: true,
  can_respond: false,
  can_quick_respond: false,
  can_cancel_my_response: false,
  can_accept_responses: false,
  can_reject_responses: false,
  can_confirm_handover: false,
  can_finalize: false,
  can_delete_request: false,
}

async function fixture(
  page: Page,
  options: { photo?: boolean; long?: boolean; landscape?: boolean } = {}
) {
  await page.route('**/api/placement-requests/270027', async (route) => {
    const language = route.request().headers()['accept-language'] ?? 'en'
    await route.fulfill({
      json: {
        data: {
          id: 270027,
          pet_id: 270027,
          user_id: 999,
          request_type: 'foster_free',
          status: 'open',
          notes: options.long
            ? 'Friendly animal, looking for a foster home. '.repeat(80)
            : 'Friendly animal.',
          notes_locale: 'en',
          notes_translation: {
            original_locale: 'en',
            viewer_locale: language,
            is_translated: false,
          },
          pet: {
            id: 270027,
            name: options.long ? 'Minnie '.repeat(20).trim() : 'Minnie',
            city: options.long ? 'Ha Long '.repeat(20).trim() : 'Ha Long',
            country: 'VN',
          },
          response_count: 0,
          viewer_role: 'owner',
          available_actions: actions,
        },
      },
    })
  })
  await page.route('**/api/pets/270027', (route) =>
    route.fulfill({
      json: {
        data: {
          id: 270027,
          name: 'Minnie',
          sex: 'female',
          birthday_precision: 'year',
          birthday_year: new Date().getFullYear() - 3,
          pet_type: { id: 1, name: 'Cat', slug: 'cat' },
          photos:
            options.photo === false
              ? []
              : [
                  {
                    id: 51,
                    medium_url: '/poster-test-medium.svg',
                    url: '/poster-test-display.svg',
                    thumb_url: '/poster-test-medium.svg',
                    is_primary: true,
                  },
                ],
        },
      },
    })
  )
  await page.route('**/poster-test-medium.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${options.landscape ? 2700 : 1800}" height="${options.landscape ? 1800 : 2700}" viewBox="0 0 1800 2700"><rect width="1800" height="2700" fill="#ddd"/><circle cx="900" cy="400" r="250" fill="#334155"/><text x="700" y="450" fill="white" font-size="140">HEAD</text><rect x="600" y="700" width="600" height="1700" fill="#94a3b8"/></svg>`,
    })
  )
}

async function ready(page: Page) {
  await expect(page.locator('.poster-sheet')).toBeVisible()
  await expect(page.locator('.poster-settings button')).toBeEnabled()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.querySelectorAll<HTMLImageElement>('.poster-sheet img'), (image) =>
        image.decode()
      )
    )
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          resolve()
        })
      )
    )
  })
}

for (const language of ['en', 'ru', 'uk', 'vi']) {
  for (const paper of ['a4', 'letter']) {
    for (const tabs of [false, true]) {
      test(`poster PDF: ${language}, ${paper}, tabs ${String(tabs)}`, async ({
        page,
      }, testInfo) => {
        await fixture(page, { long: true })
        await page.goto(
          `/requests/270027/poster?lang=${language}&paper=${paper}&tabs=${tabs ? '1' : '0'}&photo=51&focus=50,10`
        )
        await ready(page)
        const photo = page.locator('.poster-photo img')
        const screenPosition = await photo.evaluate(
          (image) => getComputedStyle(image).objectPosition
        )
        const screenRatio = await photo.evaluate((image) => image.clientWidth / image.clientHeight)
        const visibleNotes = await page.locator('.poster-notes').textContent()
        expect(visibleNotes).toMatch(/…$/)
        await page.emulateMedia({ media: 'print' })
        expect(await photo.evaluate((image) => getComputedStyle(image).objectPosition)).toBe(
          screenPosition
        )
        expect(await photo.evaluate((image) => image.clientWidth / image.clientHeight)).toBeCloseTo(
          screenRatio,
          2
        )
        expect(screenRatio).toBeCloseTo(1.5, 2)
        await expect(page.locator('.poster-editor')).toBeHidden()
        expect(await page.locator('.poster-notes').textContent()).toBe(visibleNotes)
        const measurements = await page.locator('.poster-sheet').evaluate((sheet) => {
          const bounds = sheet.getBoundingClientRect()
          const regions = Array.from(
            sheet.querySelectorAll('.poster-heading,.poster-photo,.poster-footer,.poster-tabs')
          ).map((region) => {
            const rect = region.getBoundingClientRect()
            return (
              rect.top >= bounds.top - 1 &&
              rect.bottom <= bounds.bottom + 1 &&
              rect.left >= bounds.left - 1 &&
              rect.right <= bounds.right + 1
            )
          })
          return {
            regions,
            headline: parseFloat(getComputedStyle(sheet.querySelector('h1') ?? sheet).fontSize),
            controls: sheet.querySelectorAll('button,select,input').length,
          }
        })
        expect(measurements.regions.every(Boolean)).toBe(true)
        expect(measurements.headline).toBeGreaterThanOrEqual(32) // 24pt at 96dpi
        expect(measurements.controls).toBe(0)
        await expect(page.locator('.poster-tab')).toHaveCount(tabs ? 4 : 0)
        if (tabs) {
          const geometry = await page
            .locator('.poster-tab')
            .first()
            .evaluate((tab) => ({
              qr: ((tab.querySelector('img')?.getBoundingClientRect().width ?? 0) * 25.4) / 96,
              text:
                (parseFloat(getComputedStyle(tab.querySelector('span') ?? tab).fontSize) * 72) / 96,
              overflow: tab.scrollHeight > tab.clientHeight,
            }))
          expect(geometry.qr).toBeCloseTo(18, 1)
          expect(geometry.text).toBeGreaterThanOrEqual(8)
          expect(geometry.overflow).toBe(false)
        }
        // page.pdf defaults displayHeaderFooter to false, unlike the user's
        // built-in print dialog. Explicitly enable it and retain scale=1.
        const pdf = await page.pdf({
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          scale: 1,
          printBackground: true,
        })
        await testInfo.attach(`poster-${language}-${paper}-${String(tabs)}.pdf`, {
          body: pdf,
          contentType: 'application/pdf',
        })
        const read = await readPdf(pdf)
        expect(read.pages).toBe(1)
        expect(read.widthMm).toBeCloseTo(paper === 'a4' ? 210 : 215.9, 0)
        expect(read.heightMm).toBeCloseTo(paper === 'a4' ? 297 : 279.4, 0)
        const printed = read.text
        expect(printed).not.toContain('Poster language')
        expect(printed).not.toContain('A translation is not ready')
        expect(printed).toContain('/requests/270027')
      })
    }
  }
}

for (const variant of ['no-photo', 'landscape'] as const) {
  test(`poster PDF: ${variant}`, async ({ page }) => {
    await fixture(page, { photo: variant !== 'no-photo', landscape: variant === 'landscape' })
    await page.goto('/requests/270027/poster?paper=letter&lang=en&tabs=1')
    await ready(page)
    await expect(page.locator('.poster-photo')).toHaveCount(variant === 'no-photo' ? 0 : 1)
    const pdf = await page.pdf({ preferCSSPageSize: true, displayHeaderFooter: true, scale: 1 })
    expect((await readPdf(pdf)).pages).toBe(1)
  })
}

test('photo selection and keyboard focus survive reload', async ({ page }) => {
  await fixture(page)
  await page.goto('/requests/270027/poster?lang=en')
  await ready(page)
  await page.getByRole('button', { name: 'Choose photo 1' }).click()
  await page.locator('.poster-photo').focus()
  await page.keyboard.press('ArrowUp')
  await expect(page).toHaveURL(/focus=50%2C48/)
  await page.reload()
  await ready(page)
  await expect(page.locator('.poster-photo img')).toHaveCSS('object-position', '50% 48%')
})
