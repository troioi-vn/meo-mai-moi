import { test, expect, type Page } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { MailHogClient } from './utils/mailhog'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

const TELEGRAM_PLACEHOLDER_USER = {
  email: 'telegram_5612904335@telegram.meo-mai-moi.local',
  password: 'password',
}

async function openAccountSettings(page: Page) {
  await gotoApp(page, '/settings/account')
  await expect(page).toHaveURL(/\/settings\/account/)
  await expect(page.getByRole('button', { name: 'Edit name', exact: true })).toBeVisible({
    timeout: 10000,
  })
  await expect(page.getByRole('heading', { name: 'Password', level: 4 })).toBeVisible({
    timeout: 10000,
  })
}

test.describe('Profile Settings', () => {
  test.describe.configure({ mode: 'serial' })

  test('allows editing the account name and keeps it after reload', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)
    await openAccountSettings(page)

    const updatedName = `Support Cat ${String(Date.now())}`

    await page.getByRole('button', { name: 'Edit name', exact: true }).click()

    const nameInput = page.getByRole('textbox').first()
    await expect(nameInput).toHaveValue(/Support/i)
    await nameInput.fill(updatedName)

    const updateProfileResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().endsWith('/api/users/me')
    )
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
    expect((await updateProfileResponse).ok()).toBeTruthy()

    await expect(nameInput).toHaveCount(0)
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 10000 })

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('button', { name: 'Edit name', exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Edit name', exact: true })).toBeVisible()
  })

  test('allows setting a real email for a Telegram placeholder account and verifying it', async ({
    page,
  }) => {
    const mailhog = new MailHogClient()
    await mailhog.clearMessages()

    await login(page, TELEGRAM_PLACEHOLDER_USER.email, TELEGRAM_PLACEHOLDER_USER.password)
    await openAccountSettings(page)

    const nextEmail = `telegram-real-${String(Date.now())}@example.com`

    await expect(page.getByText('Email not set', { exact: true })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: 'Set your email', exact: true }).click()

    const emailInput = page.getByRole('textbox').first()
    await emailInput.fill(nextEmail)

    const updateProfileResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' && response.url().endsWith('/api/users/me')
    )
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click()

    await expect(page.getByText('Set your email address?', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('button', { name: 'Set email and continue', exact: true }).click()
    expect((await updateProfileResponse).ok()).toBeTruthy()

    await expect(page.getByText(nextEmail, { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Please verify your new email.', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(
      page.getByRole('button', { name: 'Resend verification email', exact: true })
    ).toBeVisible({
      timeout: 10000,
    })

    const email = await mailhog.waitForEmail(nextEmail, {
      timeout: 15000,
      subject: 'Verify',
    })
    const verificationUrl = mailhog.extractVerificationUrl(email)

    if (!verificationUrl) {
      throw new Error(`Could not extract verification URL from email ${email.ID}`)
    }

    await page.goto(verificationUrl, { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(?:\?.*)?$/, { timeout: 10000 })

    await openAccountSettings(page)
    await expect(page.getByText(nextEmail, { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Set your email', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit email', exact: true })).toHaveCount(0)
  })
})
