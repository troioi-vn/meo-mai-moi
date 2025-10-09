import { test, expect } from '@playwright/test'

// Simple smoke to verify app loads and main UI shell renders
// Assumes dev server on http://localhost:5173

test('loads home page shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Vite \+ React/i)
  await expect(page.locator('#root')).toBeVisible()
})
