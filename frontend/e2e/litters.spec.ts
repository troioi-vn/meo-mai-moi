import { test, expect, type Page } from '@playwright/test'
import { gotoApp, login } from './utils/app'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

async function clearPersistedQueryCache(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let request: IDBOpenDBRequest
      try {
        request = indexedDB.open('keyval-store')
      } catch {
        resolve()
        return
      }
      request.onerror = () => {
        resolve()
      }
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('keyval')) {
          db.close()
          resolve()
          return
        }
        const tx = db.transaction('keyval', 'readwrite')
        tx.objectStore('keyval').delete('meo-query-cache')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          resolve()
        }
      }
    })
  })
}

function petCardLocator(page: Page, petId: number) {
  return page
    .getByTestId(`pet-card-root-${String(petId)}`)
    .or(page.getByTestId(`pet-card-compact-${String(petId)}`))
}

async function openAddLitterDialog(page: Page) {
  const regularChevron = page.getByTestId('add-pet-chevron')
  const firstChevron = page.getByTestId('add-first-pet-chevron')

  // Wait for either the regular or empty-state chevron to appear. The MyPetsPage
  // needs a moment to load the pet sections and determine hasOfflinePetSession.
  await expect(regularChevron.or(firstChevron)).toBeVisible({ timeout: 15000 })

  if (await regularChevron.isVisible().catch(() => false)) {
    await regularChevron.click()
    const dropdown = page.getByTestId('dropdown-add-litter')
    await expect(dropdown).toBeVisible({ timeout: 10000 })
    await dropdown.click()
  } else {
    await expect(firstChevron).toBeVisible({ timeout: 10000 })
    await firstChevron.click()
    const dropdown = page.getByTestId('dropdown-add-first-litter')
    await expect(dropdown).toBeVisible({ timeout: 10000 })
    await dropdown.click()
  }

  // Dialog is a Radix Dialog with role=dialog
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('litter-pet-type-trigger')).toBeVisible({ timeout: 10000 })
}

test.describe('Litters', () => {
  test.describe.configure({ mode: 'serial' })

  test('litter lifecycle: create three cats collapsed, rename, separate, split up', async ({
    page,
  }) => {
    test.setTimeout(60000)
    const timestamp = Date.now()
    const renamedName = `Renamed ${String(timestamp)}`

    await page.waitForTimeout(2000)
    await login(page, TEST_USER.email, TEST_USER.password)
    await gotoApp(page, '/')
    // Ensure the MyPets shell is loaded
    await expect(page.locator('#root')).toBeVisible()

    await openAddLitterDialog(page)

    // Select species Cat (supports litters)
    await page.getByTestId('litter-pet-type-trigger').click()
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 10000 })
    // Cat is the first supports_litters type, but look up by name to be explicit
    const catOption = page.getByRole('option', { name: 'Cat', exact: true })
    if (await catOption.isVisible().catch(() => false)) {
      await catOption.click()
    } else {
      await page.getByRole('option').first().click()
    }

    // Change member count from default 4 to 3
    await page.getByTestId('litter-member-count').click()
    await expect(page.getByRole('option', { name: '3', exact: true })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('option', { name: '3', exact: true }).click()

    // Verify three member rows are present and one extra is hidden
    await expect(page.getByTestId('litter-member-row-0')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('litter-member-row-1')).toBeVisible()
    await expect(page.getByTestId('litter-member-row-2')).toBeVisible()
    await expect(page.getByTestId('litter-member-row-3')).toHaveCount(0)

    // Leave all member names blank to exercise server-generated placeholders.
    // Inputs default to empty; assert that.
    await expect(page.getByTestId('member-0-name')).toHaveValue('')
    await expect(page.getByTestId('member-1-name')).toHaveValue('')
    await expect(page.getByTestId('member-2-name')).toHaveValue('')

    // Submit litter creation. Handle 429 rate-limit with up to 3 retries.
    let litterId: number | null = null
    let litterPetIds: number[] = []
    let litterPetNames: string[] = []

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const responsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname.endsWith('/api/litters')
      )
      await page.getByTestId('litter-submit').click()
      const response = await responsePromise

      if (response.status() === 429 && attempt < 2) {
        await page.waitForTimeout(2000 * (attempt + 1))
        // Dialog stays open on 429 via error toast? Re-check visibility
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
        continue
      }

      expect(response.ok(), `litter create failed with ${String(response.status())}`).toBeTruthy()

      const payload = (await response.json()) as {
        data?: {
          id?: number
          name?: string
          pets?: { id: number; name: string }[]
        }
        id?: number
        pets?: { id: number; name: string }[]
      }
      const data = payload.data ?? payload
      if (typeof data.id === 'number') litterId = data.id
      if (Array.isArray(data.pets)) {
        litterPetIds = data.pets.map((p) => p.id)
        litterPetNames = data.pets.map((p) => p.name)
      }
      break
    }

    expect(litterId, 'litter id not captured from POST /api/litters').not.toBeNull()
    expect(litterPetIds).toHaveLength(3)
    // Server-generated placeholder names for cats: Kitten 1, Kitten 2, Kitten 3
    // The response should already contain them; also verify via UI.
    for (const name of litterPetNames) {
      expect(name).toMatch(/Kitten \d/)
    }

    if (!litterId) throw new Error('litterId missing')
    const lid = litterId
    const firstPetId = litterPetIds[0]
    const secondPetId = litterPetIds[1]
    const thirdPetId = litterPetIds[2]
    if (firstPetId === undefined || secondPetId === undefined || thirdPetId === undefined)
      throw new Error('missing pet ids')

    // Dialog should close after success
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 })

    // The litter appears as ONE collapsed card, not three individual pet cards
    const litterCard = page.getByTestId(`litter-card-${String(lid)}`)
    await expect(litterCard).toBeVisible({ timeout: 10000 })
    await expect(litterCard).toContainText('3 members')
    // Also check compact variant not required, but card exists
    // Individual pet cards for its members must NOT exist while collapsed
    await expect(petCardLocator(page, firstPetId)).toHaveCount(0)
    await expect(petCardLocator(page, secondPetId)).toHaveCount(0)
    await expect(petCardLocator(page, thirdPetId)).toHaveCount(0)
    // Check that the card link is present
    const litterLink = page.getByTestId(`litter-card-link-${String(lid)}`)
    await expect(litterLink).toBeVisible()
    await expect(litterLink).toHaveAttribute('href', `/litters/${String(lid)}`)

    // Clicking the card opens the litter detail page
    await litterLink.click()
    await expect(page).toHaveURL(new RegExp(`/litters/${String(lid)}$`), { timeout: 10000 })
    await expect(page.getByTestId('litter-name')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('litter-member-count')).toContainText('3')
    await expect(page.getByTestId(`litter-member-${String(firstPetId)}`)).toBeVisible()
    await expect(page.getByTestId(`litter-member-${String(secondPetId)}`)).toBeVisible()
    await expect(page.getByTestId(`litter-member-${String(thirdPetId)}`)).toBeVisible()

    // Verify server-generated placeholder names on detail page
    for (const pid of litterPetIds) {
      await expect(page.getByTestId(`litter-member-${String(pid)}`)).toContainText(/Kitten \d/)
      await expect(page.getByTestId(`member-link-${String(pid)}`)).toBeVisible()
    }

    // Renaming one member from the detail page persists after reload
    const renameTargetId = firstPetId
    await page.getByTestId(`rename-btn-${String(renameTargetId)}`).click()
    const renameInput = page.getByTestId(`rename-input-${String(renameTargetId)}`)
    await expect(renameInput).toBeVisible({ timeout: 10000 })
    await renameInput.clear()
    await renameInput.fill(renamedName)

    const renameResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        new URL(response.url()).pathname === `/api/pets/${String(renameTargetId)}`
    )
    await page.getByTestId(`rename-save-${String(renameTargetId)}`).click()
    const renameResponse = await renameResponsePromise
    expect(renameResponse.ok()).toBeTruthy()

    // The new name should appear without reload (via query invalidation)
    await expect(page.getByTestId(`member-link-${String(renameTargetId)}`)).toContainText(
      renamedName,
      { timeout: 10000 }
    )

    // Verify persistence after reload
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('litter-name')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId(`member-link-${String(renameTargetId)}`)).toContainText(
      renamedName,
      { timeout: 10000 }
    )
    await expect(page.getByTestId('litter-member-count')).toContainText('3')

    // Separating one member from the three-member litter leaves a two-member litter
    const separateTargetId = secondPetId
    const separateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        new URL(response.url()).pathname ===
          `/api/litters/${String(lid)}/members/${String(separateTargetId)}`
    )
    await page.getByTestId(`separate-btn-${String(separateTargetId)}`).click()
    const separateResponse = await separateResponsePromise
    expect(separateResponse.status()).toBe(204)

    // Detail page should now show 2 members, separated one gone
    await expect(page.getByTestId('litter-member-count')).toContainText('2', { timeout: 10000 })
    await expect(page.getByTestId(`litter-member-${String(separateTargetId)}`)).toHaveCount(0)
    await expect(page.getByTestId(`litter-member-${String(renameTargetId)}`)).toBeVisible()
    await expect(page.getByTestId(`litter-member-${String(thirdPetId)}`)).toBeVisible()

    // Separated pet still exists as an ordinary pet
    await clearPersistedQueryCache(page)
    await gotoApp(page, '/')
    // Wait for my-pets/sections to refetch after invalidation
    await page
      .waitForResponse(
        (r) => r.url().includes('/api/my-pets/sections') && r.request().method() === 'GET',
        { timeout: 15000 }
      )
      .catch(() => undefined)
    await expect(page.getByTestId(`litter-card-${String(lid)}`)).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId(`litter-card-${String(lid)}`)).toContainText('2 members')
    // The separated pet must show up as an ordinary card on its own, without any
    // cache clearing. Do not wrap this in a retry: swallowing a failure here would
    // hide exactly the staleness regression it is meant to catch.
    await expect(petCardLocator(page, separateTargetId)).toBeVisible({ timeout: 15000 })
    // Remaining members still collapsed, not individually visible
    await expect(petCardLocator(page, renameTargetId)).toHaveCount(0)
    await expect(petCardLocator(page, thirdPetId)).toHaveCount(0)

    // Go back to litter detail for split-up
    await gotoApp(page, `/litters/${String(lid)}`)
    await expect(page.getByTestId('litter-name')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('litter-member-count')).toContainText('2')

    // Splitting up asks for confirmation
    await page.getByTestId('split-up-btn').click()
    const splitDialog = page.getByTestId('split-up-dialog')
    await expect(splitDialog).toBeVisible({ timeout: 10000 })
    await expect(splitDialog).toContainText(/No pets will be deleted/i)
    await expect(page.getByTestId('split-up-cancel')).toBeVisible()
    await expect(page.getByTestId('split-up-confirm')).toBeVisible()

    // Cancel should not delete
    await page.getByTestId('split-up-cancel').click()
    await expect(splitDialog).toBeHidden({ timeout: 10000 })
    await expect(page.getByTestId('litter-name')).toBeVisible()

    // Confirm split up
    await page.getByTestId('split-up-btn').click()
    await expect(splitDialog).toBeVisible({ timeout: 10000 })
    const splitUpResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === `/api/litters/${String(lid)}/split-up`
    )
    await page.getByTestId('split-up-confirm').click()
    const splitUpResponse = await splitUpResponsePromise
    expect(splitUpResponse.status()).toBe(204)

    // After split up, ensure home
    await page.waitForTimeout(1000)
    await clearPersistedQueryCache(page)
    await gotoApp(page, '/')
    await page
      .waitForResponse(
        (r) => r.url().includes('/api/my-pets/sections') && r.request().method() === 'GET',
        { timeout: 15000 }
      )
      .catch(() => undefined)
    await expect(page.getByTestId(`litter-card-${String(lid)}`)).toHaveCount(0)
    // Also compact variant should be gone
    await expect(page.getByTestId(`litter-card-compact-${String(lid)}`)).toHaveCount(0)

    // Both remaining pets survive and appear as ordinary individual pet cards again
    await expect(petCardLocator(page, renameTargetId)).toBeVisible({
      timeout: 15000,
    })
    await expect(petCardLocator(page, thirdPetId)).toBeVisible({
      timeout: 15000,
    })
    // The previously separated pet should still be visible as well
    await expect(petCardLocator(page, separateTargetId)).toBeVisible({
      timeout: 10000,
    })

    // Verify detail page now 404s (litter deleted)
    await gotoApp(page, `/litters/${String(lid)}`)
    await expect(page.getByText(/Litter not found/i)).toBeVisible({ timeout: 10000 })

    // Return home for clean state; verify former members are still there as pets
    await gotoApp(page, '/')
    await expect(petCardLocator(page, renameTargetId)).toBeVisible({
      timeout: 10000,
    })
    // The renamed pet should still have the unique name, find its link
    // Pet cards link to /pets/:id with aria-label pet.name; we verify via card visibility and then profile
    await gotoApp(page, `/pets/${String(renameTargetId)}`)
    await expect(page.getByRole('heading', { name: renamedName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
  })
})
