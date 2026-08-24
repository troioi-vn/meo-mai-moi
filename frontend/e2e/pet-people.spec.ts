import { test, expect, type Locator, type Page } from '@playwright/test'
import { gotoApp, login, logout, submitLoginForm } from './utils/app'
import { createPetViaApiAndOpenProfile } from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

const INVITEE_USER = {
  email: 'invitee@catarchy.space',
  password: 'password',
  name: 'Trusted Friend',
}

function sectionByTitle(page: Page, title: string, actionText: string) {
  return page
    .getByText(title, { exact: true })
    .locator(`xpath=ancestor::div[.//button[normalize-space()='${actionText}']][1]`)
}

function pendingInvitationSection(peopleSection: Locator) {
  return peopleSection
    .locator('h3')
    .filter({ hasText: 'Pending' })
    .locator('xpath=following-sibling::div[1]')
}

async function createInvitationWithRetry(page: Page, trigger: Locator) {
  let lastStatus = 0

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const createInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/pets\/\d+\/invitations$/.test(response.url())
    )

    await trigger.click()

    const response = await createInvitationResponse
    lastStatus = response.status()

    if (response.ok()) {
      return response
    }

    if (response.status() !== 429 || attempt === 2) {
      return response
    }

    await page.waitForTimeout(2000 * (attempt + 1))
  }

  throw new Error(`Invitation creation unexpectedly exhausted retries with ${String(lastStatus)}`)
}

test.describe('Pet People', () => {
  test.describe.configure({ mode: 'serial' })

  test('allows creating and revoking an invitation link', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = `People Pet ${String(Date.now())}`
    await createPetViaApiAndOpenProfile(page, petName)

    const peopleSection = sectionByTitle(page, 'People', 'Add Person')
    await expect(peopleSection).toBeVisible({ timeout: 10000 })

    await peopleSection.getByRole('button', { name: 'Add Person', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Add person', exact: true })).toBeVisible({
      timeout: 10000,
    })

    await dialog.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Editor', exact: true }).click()

    expect(
      (
        await createInvitationWithRetry(
          page,
          dialog.getByRole('button', {
            name: 'Create invitation',
            exact: true,
          })
        )
      ).ok()
    ).toBeTruthy()

    await expect(page.getByText('Invitation created')).toBeVisible({
      timeout: 10000,
    })
    const invitationLink = dialog.locator('input[readonly]').first()
    await expect(invitationLink).toBeVisible({ timeout: 10000 })
    await expect(invitationLink).toHaveValue(/\/invite\//)

    // The invitation dialog dropped its footer wrapper; the dismiss action is
    // now a plain Close button above the sheet's own close icon.
    await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    const pendingSection = pendingInvitationSection(peopleSection)
    await expect(pendingSection).toBeVisible({ timeout: 10000 })
    await expect(pendingSection.getByText('Editor', { exact: true })).toBeVisible({
      timeout: 10000,
    })

    const invitationRow = pendingSection
      .locator('div.flex.items-center.justify-between.py-2')
      .first()
    await expect(invitationRow).toBeVisible({ timeout: 10000 })

    const revokeInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        /\/api\/pets\/\d+\/invitations\/\d+$/.test(response.url())
    )
    await invitationRow.getByRole('button', { name: 'Revoke' }).click()

    // Revoking is behind a confirmation now; the X used to delete outright.
    const revokeDialog = page.getByRole('alertdialog')
    await expect(revokeDialog).toBeVisible({ timeout: 10000 })
    await revokeDialog.getByRole('button', { name: 'Revoke', exact: true }).click()
    expect((await revokeInvitationResponse).ok()).toBeTruthy()

    await expect(page.getByText('Invitation revoked')).toBeVisible({
      timeout: 10000,
    })
    await expect(pendingSection).toHaveCount(0)
  })

  test('allows accepting an invitation after login redirect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = `Invitation Pet ${String(Date.now())}`
    await createPetViaApiAndOpenProfile(page, petName)

    const peopleSection = sectionByTitle(page, 'People', 'Add Person')
    await expect(peopleSection).toBeVisible({ timeout: 10000 })
    await peopleSection.getByRole('button', { name: 'Add Person', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Add person', exact: true })).toBeVisible({
      timeout: 10000,
    })

    await dialog.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Viewer', exact: true }).click()
    expect(
      (
        await createInvitationWithRetry(
          page,
          dialog.getByRole('button', {
            name: 'Create invitation',
            exact: true,
          })
        )
      ).ok()
    ).toBeTruthy()

    const invitationLink = dialog.locator('input[readonly]').first()
    await expect(invitationLink).toBeVisible({ timeout: 10000 })
    const invitationUrl = await invitationLink.inputValue()

    if (!invitationUrl) {
      throw new Error('Invitation dialog did not expose a usable invitation URL')
    }

    // The invitation dialog dropped its footer wrapper; the dismiss action is
    // now a plain Close button above the sheet's own close icon.
    await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    await logout(page)

    const invitationPath = new URL(invitationUrl).pathname
    await gotoApp(page, invitationPath)

    if (!page.url().includes('/login?redirect=')) {
      const invitationToken = invitationPath.split('/').pop()
      if (invitationToken) {
        await page.evaluate((token) => {
          localStorage.setItem('pendingResourceInvitationToken', token)
        }, invitationToken)
      }
      await gotoApp(page, `/login?redirect=${encodeURIComponent(invitationPath)}`)
    }

    await submitLoginForm(page, INVITEE_USER.email, INVITEE_USER.password)
    await expect(page).toHaveURL(/\/invite\//, { timeout: 10000 })
    await expect(page.getByText(petName, { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText('Viewer', { exact: true })).toBeVisible({
      timeout: 10000,
    })

    const acceptInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/resource-invitations\/[^/]+\/accept$/.test(response.url())
    )
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    expect((await acceptInvitationResponse).ok()).toBeTruthy()

    await expect(page).toHaveURL(/\/pets\/\d+(?:\/view)?$/, { timeout: 10000 })
    await expect(page).not.toHaveURL(/\/invite\//)
    await expect(page.getByText(petName, { exact: true }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('allows adding a previously shared user directly', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petAName = `Shared Pet A ${String(Date.now())}`
    await createPetViaApiAndOpenProfile(page, petAName)

    const peopleSectionA = sectionByTitle(page, 'People', 'Add Person')
    await peopleSectionA.getByRole('button', { name: 'Add Person', exact: true }).click()

    const setupDialog = page.getByRole('dialog')
    await setupDialog.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Editor', exact: true }).click()
    expect(
      (
        await createInvitationWithRetry(
          page,
          setupDialog.getByRole('button', {
            name: 'Create invitation',
            exact: true,
          })
        )
      ).ok()
    ).toBeTruthy()

    const invitationLink = setupDialog.locator('input[readonly]').first()
    await expect(invitationLink).toBeVisible({ timeout: 10000 })
    const invitationUrl = await invitationLink.inputValue()

    if (!invitationUrl) {
      throw new Error('Invitation dialog did not expose a usable invitation URL')
    }

    await setupDialog.getByRole('button', { name: 'Close', exact: true }).first().click()
    await expect(setupDialog).not.toBeVisible({ timeout: 10000 })

    await logout(page)

    const invitationPath = new URL(invitationUrl).pathname
    await gotoApp(page, `/login?redirect=${encodeURIComponent(invitationPath)}`)
    await submitLoginForm(page, INVITEE_USER.email, INVITEE_USER.password)
    await expect(page).toHaveURL(/\/invite\//, { timeout: 10000 })

    const acceptInvitationResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/resource-invitations\/[^/]+\/accept$/.test(response.url())
    )
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    expect((await acceptInvitationResponse).ok()).toBeTruthy()

    await logout(page)
    await login(page, TEST_USER.email, TEST_USER.password)

    const petBName = `Shared Pet B ${String(Date.now())}`
    await createPetViaApiAndOpenProfile(page, petBName)

    const peopleSectionB = sectionByTitle(page, 'People', 'Add Person')
    await peopleSectionB.getByRole('button', { name: 'Add Person', exact: true }).click()

    const addDialog = page.getByRole('dialog')
    await addDialog.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Editor', exact: true }).click()

    // "Previously shared with" is now titled "Suggested".
    await expect(addDialog.getByRole('heading', { name: 'Suggested', exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(addDialog.getByText(INVITEE_USER.name, { exact: true })).toBeVisible({
      timeout: 10000,
    })

    const addUserResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && /\/api\/pets\/\d+\/users$/.test(response.url())
    )
    await addDialog.getByRole('button', { name: 'Add', exact: true }).click()

    // Adding a suggested person is behind a confirmation now.
    const addConfirmDialog = page.getByRole('alertdialog')
    await expect(addConfirmDialog).toBeVisible({ timeout: 10000 })
    await addConfirmDialog.getByRole('button', { name: 'Add', exact: true }).click()
    expect((await addUserResponse).ok()).toBeTruthy()

    await expect(page.getByText(`${INVITEE_USER.name} added`)).toBeVisible({
      timeout: 10000,
    })
    await expect(addDialog).not.toBeVisible({ timeout: 10000 })
    await expect(peopleSectionB.getByText(INVITEE_USER.name, { exact: true })).toBeVisible({
      timeout: 10000,
    })
  })
})
