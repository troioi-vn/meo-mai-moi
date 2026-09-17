import { test, expect } from '@playwright/test'

// Simple smoke to verify app loads and main UI shell renders
// Uses the configured baseURL (PLAYWRIGHT_BASE_URL), defaulting to http://localhost:8000
//
// Tests tagged @smoke also run in the pull-request gate (.woodpecker/test.yml)
// against a bare `php artisan serve` stack with no MailHog, queue worker, or
// nginx. Tag only tests that need nothing beyond the seeded database.

test('loads home page shell', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/')
  const expected = process.env.PLAYWRIGHT_EXPECT_TITLE
  if (expected?.trim()) {
    await expect(page).toHaveTitle(new RegExp(expected, 'i'))
  } else {
    await expect(page).toHaveTitle(/Meo Mai Moi/i)
  }
  await expect(page.locator('#root')).toBeVisible()
})
