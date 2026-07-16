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

const testAvatar = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

async function uploadAvatar(page: Page, name = 'test-avatar.png') {
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes('/api/users/me/avatar')
  )

  await page.getByRole('button', { name: /upload/i }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: testAvatar,
  })

  expect((await uploadResponse).ok()).toBeTruthy()
  await expect(page.getByRole('button', { name: /remove/i })).toBeVisible({ timeout: 15000 })
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

  test.describe('Avatar', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await openAccountSettings(page)
    })

    test('uploads a new avatar', async ({ page }) => {
      await uploadAvatar(page)
    })

    test('rejects invalid avatar files', async ({ page }) => {
      await page.getByRole('button', { name: /upload/i }).click()
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is not an image'),
      })

      await expect(page.getByText(/please select an image file/i)).toBeVisible()
    })

    test('rejects avatars larger than the upload limit', async ({ page }) => {
      await page.getByRole('button', { name: /upload/i }).click()
      await page.locator('input[type="file"]').setInputFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(11 * 1024 * 1024, 'a'),
      })

      await expect(page.getByText(/file is too large/i)).toBeVisible()
    })

    test('replaces an existing avatar', async ({ page }) => {
      await uploadAvatar(page, 'first-avatar.png')
      await uploadAvatar(page, 'replacement-avatar.png')
    })

    test('removes an existing avatar', async ({ page }) => {
      if ((await page.getByRole('button', { name: /remove/i }).count()) === 0) {
        await uploadAvatar(page)
      }

      await page.getByRole('button', { name: /remove/i }).click()
      await expect(page.getByRole('button', { name: /remove/i })).toHaveCount(0)
    })
  })

  test.describe('Password', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password)
      await openAccountSettings(page)
    })

    test('opens the change-password dialog', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()

      const dialog = page.getByRole('dialog', { name: /change password/i })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel(/current password/i)).toBeVisible()
      await expect(dialog.getByLabel('New Password', { exact: true })).toBeVisible()
      await expect(dialog.getByLabel('Confirm New Password', { exact: true })).toBeVisible()
    })

    test('shows validation errors for an invalid password change', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()
      const dialog = page.getByRole('dialog', { name: /change password/i })

      await dialog.getByRole('button', { name: /change password/i }).click()

      await expect(dialog.getByText('This field is required')).toHaveCount(2)
      await expect(dialog.getByText(/password must be at least 10 characters/i)).toBeVisible()
    })

    test('cancels a password change with Escape', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })
})
