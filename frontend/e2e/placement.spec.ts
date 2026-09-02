import { expect, test } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetViaApiAndOpenProfile } from './utils/pets'
import { createRequestViaDialog, deletePlacementRequestViaApi } from './utils/placement'
import { petName as demoPetName } from './utils/demo-data'

const TEST_USER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Placement requests', () => {
  test('allows an owner to create and discover a permanent placement request', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password)

    const petName = demoPetName()
    const notes = `Permanent home needed for ${petName}`
    const { petId } = await createPetViaApiAndOpenProfile(page, petName)

    const requestId = await createRequestViaDialog(page, { typeLabel: 'Permanent', notes })

    await expect(page).toHaveURL(`/requests/${String(requestId)}`, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Permanent/, level: 1 })).toBeVisible()
    await expect(page.getByText(notes, { exact: true })).toBeVisible()

    await gotoApp(page, '/requests')
    const requestCard = page.getByTestId(`pet-card-root-${String(petId)}`)
    await expect(requestCard).toBeVisible({ timeout: 10000 })
    await expect(
      requestCard.getByRole('link', { name: petName, exact: true }).first()
    ).toBeVisible()
    await expect(requestCard.getByText('PERMANENT', { exact: true })).toBeVisible()

    // The dev deployment is a public demo and /requests is one of its most
    // visible pages. Take the request back off it rather than leaving it there
    // until the next reseed. This also covers the owner-cancels path.
    expect((await deletePlacementRequestViaApi(page, requestId)).ok).toBeTruthy()

    await gotoApp(page, '/requests')
    await expect(page.getByTestId(`pet-card-root-${String(petId)}`)).toHaveCount(0, {
      timeout: 10000,
    })
  })
})
