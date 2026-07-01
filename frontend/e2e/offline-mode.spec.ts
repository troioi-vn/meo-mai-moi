import { test, expect, type Page, type Locator } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import {
  createPetViaApiAndOpenProfile,
  openCreatePetPage,
  selectPetType,
  setBirthdayPrecisionUnknown,
} from './utils/pets'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

function sectionByTitle(page: Page, title: string, actionText: string) {
  return page
    .getByText(title, { exact: true })
    .locator(`xpath=ancestor::div[.//button[normalize-space()='${actionText}']][1]`)
}

function habitDialog(page: Page): Locator {
  return page.getByRole('dialog').last()
}

async function emulateOffline(page: Page) {
  await page.context().setOffline(true)
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    })
    window.dispatchEvent(new Event('offline'))
  })
}

async function emulateOnline(page: Page) {
  await page.context().setOffline(false)
  await page.evaluate(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    })
    window.dispatchEvent(new Event('online'))
  })
}

test.describe('Offline Mode', () => {
  test.describe.configure({ mode: 'serial' })

  test('cold-starts offline into authenticated pet management from cached auth', async ({
    page,
  }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    await gotoApp(page, '/')
    await expect(page.locator('[data-slot="dropdown-menu-trigger"]').first()).toBeVisible({
      timeout: 10000,
    })

    await gotoApp(page, '/pets/create')
    await expect(page.locator('input#name')).toBeVisible({ timeout: 10000 })
    await selectPetType(page, 'Cat')

    await emulateOffline(page)
    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    await expect(page.locator('[data-slot="dropdown-menu-trigger"]').first()).toBeVisible({
      timeout: 10000,
    })

    await gotoApp(page, '/pets/create')
    await expect(page.locator('input#name')).toBeVisible({ timeout: 10000 })
    await page.getByRole('combobox').first().click()
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10000 })

    await emulateOnline(page)
  })

  test('creates pet offline from home and shows optimistic pet', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)
    await openCreatePetPage(page)

    const petName = `Offline Home Create Pet ${String(Date.now())}`

    await emulateOffline(page)
    await gotoApp(page, '/')

    await expect(page.locator('[data-slot="dropdown-menu-trigger"]').first()).toBeVisible({
      timeout: 10000,
    })

    const addPetButton = page.getByRole('button', { name: /add( your first)? pet/i }).first()
    await expect(addPetButton).toBeVisible({ timeout: 10000 })
    await addPetButton.click()
    await expect(page.locator('input#name')).toBeVisible({ timeout: 10000 })

    await page.locator('input#name').fill(petName)
    await selectPetType(page, 'Cat')
    await setBirthdayPrecisionUnknown(page)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })
    await expect(page.getByText(petName, { exact: true })).toBeVisible({ timeout: 10000 })

    await emulateOnline(page)
  })

  test('queues pet creation offline and syncs it after reconnect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)
    await openCreatePetPage(page)

    const petName = `Offline Create Pet ${String(Date.now())}`

    await emulateOffline(page)

    await page.locator('input#name').fill(petName)
    await selectPetType(page, 'Cat')
    await setBirthdayPrecisionUnknown(page)
    await page.locator('form button[type="submit"]').click()

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })

    await emulateOnline(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await gotoApp(page, '/')
    const petLink = page.getByRole('link', { name: petName, exact: true }).first()
    await expect(petLink).toBeVisible({ timeout: 10000 })
    await expect.poll(async () => await petLink.getAttribute('href')).toMatch(/\/pets\/\d+$/)
    await expect(page.getByText(/syncing changes/i)).toHaveCount(0, { timeout: 15000 })
  })

  test('queues pet edits offline and persists them after reconnect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const originalName = `Offline Edit Pet ${String(Date.now())}`
    const updatedName = `${originalName} Updated`
    const updatedDescription = `Offline updated description ${String(Date.now())}`

    const { petId } = await createPetViaApiAndOpenProfile(page, originalName)

    await gotoApp(page, `/pets/${String(petId)}?edit=general`)
    await expect(page.getByRole('tab', { name: 'General' })).toHaveAttribute('data-state', 'active')

    await emulateOffline(page)

    await page.getByLabel('Name').fill(updatedName)
    await page.getByLabel('Description').fill(updatedDescription)
    await page.getByRole('button', { name: 'Update Pet', exact: true }).click()

    await expect(page.getByRole('heading', { name: updatedName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible()
    const updateReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === 'PUT' &&
        new RegExp(`/api/pets/${String(petId)}$`).test(response.url()) &&
        response.ok()
      )
    })

    await emulateOnline(page)
    await updateReplay

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: updatedName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible()
  })

  test('queues pet deletion offline and keeps it deleted after reconnect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = `Offline Delete Pet ${String(Date.now())}`
    const { petId } = await createPetViaApiAndOpenProfile(page, petName)

    await gotoApp(page, `/pets/${String(petId)}?edit=status`)
    await expect(page.getByRole('tab', { name: 'Status' })).toHaveAttribute('data-state', 'active')

    await emulateOffline(page)

    await page.getByRole('button', { name: 'Remove pet', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm remove', exact: true }).click()

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })
    await expect(page.getByRole('link', { name: petName, exact: true })).toHaveCount(0)

    const deleteReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === 'DELETE' &&
        new RegExp(`/api/pets/${String(petId)}$`).test(response.url()) &&
        response.ok()
      )
    })

    await emulateOnline(page)
    await deleteReplay

    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: petName, exact: true })).toHaveCount(0)
  })

  test('queues medical record creation offline and persists after reconnect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = `Offline Medical Pet ${String(Date.now())}`
    const description = `Offline checkup ${String(Date.now())}`
    const { petId } = await createPetViaApiAndOpenProfile(page, petName)

    const medicalSection = sectionByTitle(page, 'Medical Records', 'Add Medical Record')

    await emulateOffline(page)

    await medicalSection.getByRole('button', { name: 'Add Medical Record', exact: true }).click()
    const medicalCreateForm = page.locator('form').last()
    await medicalCreateForm.getByPlaceholder('e.g., Annual checkup — all clear').fill(description)
    await medicalCreateForm.getByRole('button', { name: 'Save', exact: true }).click()

    await expect(page.locator('li').filter({ hasText: description }).first()).toBeVisible({
      timeout: 10000,
    })

    const createReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        new RegExp(`/api/pets/${String(petId)}/medical-records$`).test(response.url()) &&
        response.ok()
      )
    })

    await emulateOnline(page)
    await createReplay

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('li').filter({ hasText: description }).first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/syncing changes/i)).toHaveCount(0, { timeout: 15000 })
  })

  test('queues habit day check-in offline and persists after reconnect', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const timestamp = Date.now()
    const petName = `Offline Habit Pet ${String(timestamp)}`
    const habitName = `Daily Feed ${String(timestamp)}`

    await createPetViaApiAndOpenProfile(page, petName)
    await gotoApp(page, '/habits')
    await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole('button', { name: 'Add Habit', exact: true }).click()
    const createDialog = habitDialog(page)
    await createDialog.getByLabel('Habit name').fill(habitName)
    await createDialog.getByRole('button', { name: 'Continue', exact: true }).click()
    await createDialog.getByText(petName, { exact: true }).click()
    await createDialog.getByRole('button', { name: 'Create habit', exact: true }).click()

    const habitLink = page.getByRole('link', { name: habitName, exact: true }).first()
    await expect(habitLink).toBeVisible({ timeout: 10000 })
    await habitLink.click()
    await expect(page).toHaveURL(/\/habits\/\d+$/, { timeout: 10000 })

    await emulateOffline(page)

    await page.getByRole('button', { name: 'Track activity', exact: true }).click()
    const dayDialog = habitDialog(page)
    const daySwitch = dayDialog.getByRole('switch').first()
    await expect(daySwitch).toBeVisible({ timeout: 10000 })
    await daySwitch.click()
    await dayDialog.getByRole('button', { name: 'Save day', exact: true }).click()

    const saveReplay = page.waitForResponse((response) => {
      return (
        response.request().method() === 'PUT' &&
        /\/api\/habits\/\d+\/entries\//.test(response.url()) &&
        response.ok()
      )
    })

    await emulateOnline(page)
    await saveReplay

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: habitName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole('button', { name: 'Track activity', exact: true }).click()
    const reloadedDayDialog = habitDialog(page)
    await expect(reloadedDayDialog.getByRole('switch').first()).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })
})
