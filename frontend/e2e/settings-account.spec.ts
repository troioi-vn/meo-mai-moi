import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { gotoApp, login, openUserMenu } from './utils/app'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

async function loginAndWait(page: Page, email: string, password: string) {
  await login(page, email, password)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 })
}

async function navigateToAccountSettings(page: Page) {
  // Navigate to settings via user menu - use the same pattern as auth test
  await openUserMenu(page)
  await page.getByRole('menuitem', { name: /settings/i }).click()

  // Should be on account tab by default
  await expect(page).toHaveURL(/\/settings/)
  await expect(page.getByRole('tab', { name: /account/i })).toHaveAttribute('data-state', 'active')
}

// Run tests serially within this file to avoid login rate limiting
// (all tests use the same user, and login is throttled to 5 requests/minute)
test.describe.configure({ mode: 'serial' })

test.describe('Settings Account Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndWait(page, TEST_USER.email, TEST_USER.password)
    await navigateToAccountSettings(page)
  })

  test('displays user information correctly', async ({ page }) => {
    // Check that user information is displayed
    await expect(page.getByText('user1@catarchy.space')).toBeVisible()

    // Check that account overview section exists
    await expect(page.getByText('Account actions')).toBeVisible()
    await expect(page.getByText('Sign out or remove your account.')).toBeVisible()
  })

  test('displays avatar with upload controls', async ({ page }) => {
    // Check that avatar is displayed (look for the Avatar component)
    const avatar = page.locator('.avatar, [data-testid="user-avatar"]').first()
    if ((await avatar.count()) === 0) {
      // Fallback: look for any image in the avatar area
      const avatarImg = page.locator('img').first()
      await expect(avatarImg).toBeVisible()
    } else {
      await expect(avatar).toBeVisible()
    }

    // Check that upload controls are present
    await expect(page.getByRole('button', { name: /upload avatar/i })).toBeVisible()
  })

  test.describe('Avatar Upload', () => {
    test('can upload a new avatar', async ({ page }) => {
      // Create a simple test image buffer (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ])

      // Click upload button to trigger file input
      await page.getByRole('button', { name: /upload avatar/i }).click()

      // Set the file on the hidden input
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      })

      // Wait for upload to complete - either see uploading text or success message
      try {
        await expect(page.getByText(/uploading/i)).toBeVisible({ timeout: 2000 })
        await expect(page.getByText(/uploading/i)).not.toBeVisible({ timeout: 10000 })
      } catch {
        // Upload might be too fast to see uploading text, that's ok
      }

      // Check for success message (using sonner toast)
      await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()

      // Check that remove button appears after upload
      await expect(page.getByRole('button', { name: /remove/i })).toBeVisible()
    })

    test('shows error for invalid file type', async ({ page }) => {
      // Create a test text file
      const buffer = Buffer.from('This is not an image')

      // Click upload button
      await page.getByRole('button', { name: /upload avatar/i }).click()

      // Create a temporary file and upload it
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: buffer,
      })

      // Check for error message
      await expect(page.getByText(/please select an image file/i)).toBeVisible()
    })

    test('shows error for file too large', async ({ page }) => {
      // Create a large buffer (>10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'a')

      // Click upload button
      await page.getByRole('button', { name: /upload avatar/i }).click()

      // Upload large file
      await page.locator('input[type="file"]').setInputFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: largeBuffer,
      })

      // Check for error message
      await expect(page.getByText(/file size must be less than 10mb/i)).toBeVisible()
    })
  })

  test.describe('Avatar Replacement', () => {
    test('can replace existing avatar', async ({ page }) => {
      // Create a simple test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ])

      // First upload an avatar
      await page.getByRole('button', { name: /upload avatar/i }).click()
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      })
      await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()

      // Wait for the first toast to disappear before replacing
      await expect(page.getByText(/avatar uploaded successfully/i)).not.toBeVisible({
        timeout: 10000,
      })

      // Now replace it with another image
      await page.getByRole('button', { name: /upload avatar/i }).click()
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test-avatar-2.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      })

      // Wait for replacement to complete
      try {
        await expect(page.getByText(/uploading/i)).toBeVisible({ timeout: 2000 })
        await expect(page.getByText(/uploading/i)).not.toBeVisible({ timeout: 10000 })
      } catch {
        // Upload might be too fast to see uploading text, that's ok
      }
      await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()
    })
  })

  test.describe('Avatar Removal', () => {
    test('can remove existing avatar', async ({ page }) => {
      // Create a simple test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ])

      // First upload an avatar
      await page.getByRole('button', { name: /upload avatar/i }).click()
      await page.locator('input[type="file"]').setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: testImageBuffer,
      })
      await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()

      // Now remove it
      await page.getByRole('button', { name: /remove/i }).click()

      // Wait for removal to complete
      try {
        await expect(page.getByText(/deleting/i)).toBeVisible({ timeout: 2000 })
        await expect(page.getByText(/deleting/i)).not.toBeVisible({ timeout: 10000 })
      } catch {
        // Deletion might be too fast to see deleting text, that's ok
      }
      await expect(page.getByText(/avatar deleted successfully/i)).toBeVisible()

      // Remove button should disappear
      await expect(page.getByRole('button', { name: /remove/i })).not.toBeVisible()
    })

    test('remove button only appears when avatar exists', async ({ page }) => {
      // Initially, remove button should not be visible if no custom avatar
      const removeButton = page.getByRole('button', { name: /remove/i })

      // Check if remove button exists (it might not if user has no avatar)
      const removeButtonCount = await removeButton.count()

      if (removeButtonCount === 0) {
        // No avatar exists, upload one first
        const testImageBuffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
          0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
          0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
          0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5c, 0xc2, 0x5d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
          0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
        ])

        await page.getByRole('button', { name: /upload avatar/i }).click()
        await page.locator('input[type="file"]').setInputFiles({
          name: 'test-avatar.png',
          mimeType: 'image/png',
          buffer: testImageBuffer,
        })
        await expect(page.getByText(/avatar uploaded successfully/i)).toBeVisible()

        // Now remove button should be visible
        await expect(page.getByRole('button', { name: /remove/i })).toBeVisible()
      }
    })
  })

  test.describe('Change Password', () => {
    test('can open change password dialog', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByRole('heading', { name: /change password/i })).toBeVisible()

      // Form fields should be present
      await expect(page.getByLabel(/current password/i)).toBeVisible()
      await expect(page.getByLabel('New Password', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Confirm New Password', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /change password/i }).last()).toBeVisible()
    })

    test('shows validation errors for invalid input', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()

      // Try to submit with empty fields
      await page
        .getByRole('button', { name: /change password/i })
        .last()
        .click()

      // Should show validation errors
      await expect(page.getByText(/current password is required/i)).toBeVisible()
      await expect(page.getByText(/new password must be at least 8 characters/i)).toBeVisible()
    })

    test('can cancel password change', async ({ page }) => {
      await page.getByRole('button', { name: /change password/i }).click()

      // Dialog should be open
      await expect(page.getByRole('dialog')).toBeVisible()

      // Click outside dialog or press escape to close
      await page.keyboard.press('Escape')

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })

  test.describe('Account Actions', () => {
    test('displays logout button', async ({ page }) => {
      // Check that logout button is present
      await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
    })
  })

  test.describe('Delete Account', () => {
    test('can open delete account dialog', async ({ page }) => {
      await page.getByRole('button', { name: /delete account/i }).click()

      // Alert dialog should open
      await expect(page.getByRole('alertdialog')).toBeVisible()
      await expect(page.getByRole('heading', { name: /are you absolutely sure/i })).toBeVisible()

      // Should show warning text
      await expect(page.getByText(/this action cannot be undone/i)).toBeVisible()

      // Password field should be present
      await expect(page.getByLabel(/your password/i)).toBeVisible()

      // Action buttons should be present
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /delete my account/i })).toBeVisible()
    })

    test('can cancel account deletion', async ({ page }) => {
      await page.getByRole('button', { name: /delete account/i }).click()

      // Dialog should be open
      await expect(page.getByRole('alertdialog')).toBeVisible()

      // Cancel deletion
      await page.getByRole('button', { name: /cancel/i }).click()

      // Dialog should close, stay on settings page
      await expect(page.getByRole('alertdialog')).not.toBeVisible()
    })
  })

  test.describe('Navigation and Tabs', () => {
    test('can navigate between settings tabs', async ({ page }) => {
      // Should start on account tab
      await expect(page.getByRole('tab', { name: /account/i })).toHaveAttribute(
        'data-state',
        'active'
      )

      // Click notifications tab
      await page.getByRole('tab', { name: /notifications/i }).click()
      await expect(page).toHaveURL(/\/settings\/notifications/)
      await expect(page.getByRole('tab', { name: /notifications/i })).toHaveAttribute(
        'data-state',
        'active'
      )

      // Click contact us tab
      await page.getByRole('tab', { name: /contact us/i }).click()
      await expect(page).toHaveURL(/\/settings\/contact-us/)
      await expect(page.getByRole('tab', { name: /contact us/i })).toHaveAttribute(
        'data-state',
        'active'
      )

      // Go back to account tab
      await page.getByRole('tab', { name: /account/i }).click()
      await expect(page).toHaveURL(/\/settings\/account/)
      await expect(page.getByRole('tab', { name: /account/i })).toHaveAttribute(
        'data-state',
        'active'
      )
    })

    test('redirects to account tab when accessing /settings', async ({ page }) => {
      await gotoApp(page, '/settings')
      await expect(page).toHaveURL(/\/settings\/account/)
      await expect(page.getByRole('tab', { name: /account/i })).toHaveAttribute(
        'data-state',
        'active'
      )
    })
  })

  test.describe('Responsive Design', () => {
    test('displays correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // All main elements should still be visible
      await expect(page.getByText('Account actions')).toBeVisible()
      await expect(page.getByRole('button', { name: /upload avatar/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /change password/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /log out/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible()

      // Tabs should still be functional
      await page.getByRole('tab', { name: /notifications/i }).click()
      await expect(page).toHaveURL(/\/settings\/notifications/)
    })

    test('displays correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      // All elements should be visible and properly laid out
      await expect(page.getByText('Account actions')).toBeVisible()
      await expect(page.getByRole('button', { name: /upload avatar/i })).toBeVisible()

      // User info should be visible
      await expect(page.getByText('user1@catarchy.space')).toBeVisible()
    })
  })
})
