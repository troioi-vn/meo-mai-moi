import { test, expect } from '@playwright/test'
import { gotoApp } from './utils/app'
import { MailHogClient } from './utils/mailhog'

const TEST_USER = { email: 'password-reset@catarchy.space', password: 'password' }

test.describe('Password Reset', () => {
  test.describe.configure({ mode: 'serial' })

  let mailhog: MailHogClient

  test.beforeEach(async () => {
    mailhog = new MailHogClient()
    await mailhog.clearMessages()
  })

  test('forgot password page loads with form', async ({ page }) => {
    await gotoApp(page, '/forgot-password')

    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible()
  })

  test('full password reset flow via email link', async ({ page }) => {
    // Step 1: Request reset link (wait for API response to confirm it succeeded)
    await gotoApp(page, '/forgot-password')
    await page.getByLabel(/email/i).fill(TEST_USER.email)
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/password/email') && res.status() === 200
    )
    await page.getByRole('button', { name: /send reset link/i }).click()
    await responsePromise

    // Should show the success state with the user's email
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(new RegExp(TEST_USER.email))).toBeVisible()

    // Step 2: Retrieve reset email from MailHog
    const email = await mailhog.waitForEmail(TEST_USER.email, {
      timeout: 15000,
      subject: 'Reset',
    })
    expect(email).toBeTruthy()

    // Step 3: Extract reset URL from email body
    const resetUrl = extractPasswordResetUrl(email)
    expect(resetUrl).toBeTruthy()

    // Step 4: Visit the reset URL (goes through backend redirect to frontend)
    // oxlint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by the assertion above
    await page.goto(resetUrl!)
    // Backend redirects to /password/reset/{token}?email=...
    await expect(page).toHaveURL(/\/password\/reset\//, { timeout: 15000 })

    // Step 5: Wait for token validation, then fill reset form
    await expect(page.getByLabel(/new password/i).first()).toBeVisible({ timeout: 15000 })

    const newPassword = 'NewSecurePassword1'
    await page
      .getByLabel(/new password/i)
      .first()
      .fill(newPassword)
    await page.getByLabel(/confirm.*password/i).fill(newPassword)
    await page.getByRole('button', { name: /reset password/i }).click()

    // Step 6: Should show success
    await expect(page.getByRole('heading', { name: /password reset successfully/i })).toBeVisible({
      timeout: 10000,
    })

    // Step 7: Should redirect to login (auto-redirect or link)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Step 8: Login with new password works
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
    await page.getByLabel('Email', { exact: true }).fill(TEST_USER.email)
    const nextButton = page.getByRole('button', { name: /next/i })
    if (await nextButton.isVisible()) {
      await nextButton.click()
    }
    await page.getByLabel('Password', { exact: true }).fill(newPassword)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })

    // Step 9: Restore original password so other tests aren't affected.
    // The seeded password ("password") is shorter than the UI validation minimum,
    // so we restore it via artisan tinker to bypass form validation.
    const { execSync } = await import('child_process')
    execSync(
      `docker compose exec -T backend php artisan tinker --execute="\\App\\Models\\User::where('email','${TEST_USER.email}')->update(['password'=>bcrypt('${TEST_USER.password}')])"`,
      { cwd: process.cwd(), timeout: 15000 }
    )
  })

  test('invalid reset token shows error', async ({ page }) => {
    await page.goto(
      `/password/reset/invalid-token-here?email=${encodeURIComponent(TEST_USER.email)}`
    )
    await expect(page.locator('#root')).toBeVisible()

    // Should show invalid/expired link message
    await expect(page.getByRole('heading', { name: /invalid reset link/i })).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page
        .getByRole('link', { name: /request new reset link/i })
        .or(page.getByRole('button', { name: /request new reset link/i }))
    ).toBeVisible()
  })
})

/**
 * Extract password reset URL from a MailHog email message.
 * The email contains a link to the backend's /reset-password/{token} route
 * which then redirects to the frontend.
 */
function extractPasswordResetUrl(message: import('./utils/mailhog').MailHogMessage): string | null {
  const mimeBodies = message.MIME?.Parts?.map((part) => part.Body ?? '') ?? []
  const candidateBodies = [message.Content.Body, message.Raw.Data, ...mimeBodies]

  for (const rawBody of candidateBodies) {
    // Normalize quoted-printable encoding
    const body = rawBody
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
      .replace(/&amp;/g, '&')

    // Match the backend reset URL pattern
    const patterns = [
      /https?:\/\/[^\s"<]+\/reset-password\/[^\s"<]+/g,
      /https?:\/\/[^\s"<]+\/password\/reset\/[^\s"<]+/g,
    ]

    for (const pattern of patterns) {
      const match = body.match(pattern)
      if (match) {
        return match[0]
      }
    }
  }
  return null
}
