import { test, expect } from '@playwright/test'

// Simple smoke to verify app loads and main UI shell renders
// Assumes dev server on http://localhost:5173

test('loads home page shell', async ({ page }) => {
  await page.goto('/')
  const expected = process.env.PLAYWRIGHT_EXPECT_TITLE
  if (expected && expected.trim()) {
    await expect(page).toHaveTitle(new RegExp(expected, 'i'))
  } else {
    // Support both local Vite template and branded deployments
    await expect(page).toHaveTitle(/Meo Mai Moi|Vite \+ React/i)
  }
  await expect(page.locator('#root')).toBeVisible()
})
