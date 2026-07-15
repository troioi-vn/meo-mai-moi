import { test, expect } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createGroupViaApi, openGroupSettings } from './utils/groups'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Groups', () => {
  test('opens list, group detail, and settings for an owned group', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const timestamp = Date.now()
    const groupName = `E2E Group ${String(timestamp)}`
    const groupId = await createGroupViaApi(page, groupName)

    await gotoApp(page, '/groups')
    await expect(page.getByRole('heading', { name: 'Groups', level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('link', { name: new RegExp(groupName) })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole('link', { name: new RegExp(groupName) }).click()
    await expect(page).toHaveURL(new RegExp(`/groups/${String(groupId)}$`), { timeout: 10000 })
    await expect(page.getByRole('heading', { name: groupName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('Members', { exact: true })).toBeVisible()

    await openGroupSettings(page, groupId, groupName)
    await expect(page.getByRole('button', { name: 'Invite someone', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Leave group', exact: true })).toBeVisible()
  })
})
