import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './utils/app'
import { createPetViaApi } from './utils/pets'
import { groupName as demoGroupName, petName as demoPetName } from './utils/demo-data'
import { createGroupViaApi, joinGroupViaInvitation, removeGroupPetViaApi } from './utils/groups'
import {
  confirmHandoverAsHelper,
  createPlacementRequestViaApi,
  createRequestViaDialog,
  decideOnResponse,
  deletePlacementRequestViaApi,
  expectRequestStatus,
  openRequestDetail,
  openSession,
  respondAsHelper,
  type TestCredentials,
  type UserSession,
} from './utils/placement'

/**
 * A rescue rehoming a cat, from the volunteer's side.
 *
 * The point of these tests is the gap between two people who used to be the
 * same person. The pet belongs to RESCUE_ADMIN; every placement action is taken
 * by VOLUNTEER, who has never owned it and is not the owner of anything here.
 * If authority ever slides back onto the ownership record or onto
 * `placement_requests.user_id`, these fail and the p2p suite does not.
 */

// Owns the pet and administers the group. Deliberately never touches the
// placement itself after handing the cat to the group.
const RESCUE_ADMIN: TestCredentials = {
  email: 'user1@catarchy.space',
  password: 'password',
  name: 'Support 🐱',
}

// The volunteer. Joins by invitation, then runs the whole listing.
const VOLUNTEER: TestCredentials = {
  email: 'demo@catarchy.space',
  password: 'password',
  name: 'Demo Caregiver',
}

// Seeded helper profile accepts `permanent`, which is the type that moves
// ownership and so exercises the group handover rules.
const ADOPTER: TestCredentials = {
  email: 'invitee@catarchy.space',
  password: 'password',
  name: 'Trusted Friend',
}

/**
 * Pet lists honour a persisted compact preference, and the two card components
 * carry different test ids. Match either, so the assertion is about the pet
 * being listed rather than about how the viewer likes their grid.
 */
const petCard = (page: Page, petId: number) =>
  page.locator(
    `[data-testid="pet-card-root-${String(petId)}"], [data-testid="pet-card-compact-${String(petId)}"]`
  )

test.describe('Group placement', () => {
  // Three signed-in participants, an invitation handshake and a full handover.
  test.describe.configure({ mode: 'serial', timeout: 180 * 1000 })

  let admin: UserSession
  let volunteer: UserSession
  let adopter: UserSession

  test.beforeAll(async ({ browser }) => {
    admin = await openSession(browser, RESCUE_ADMIN)
    volunteer = await openSession(browser, VOLUNTEER)
    adopter = await openSession(browser, ADOPTER)
  })

  test.afterAll(async () => {
    await Promise.all([admin.context.close(), volunteer.context.close(), adopter.context.close()])
  })

  /** A pet owned by the admin, shared into a fresh group the volunteer joins. */
  async function setUpRescue() {
    const petName = demoPetName()
    const { petId } = await createPetViaApi(admin.page, petName)

    const groupLabel = demoGroupName()
    const groupId = await createGroupViaApi(admin.page, groupLabel, { petIds: [petId] })
    await joinGroupViaInvitation(admin.page, volunteer.page, groupId, 'member')

    return { petId, petName, groupId, groupName: groupLabel }
  }

  test('lets a volunteer list a group pet and carry it through to a new owner', async () => {
    const { petId, petName, groupId, groupName } = await setUpRescue()

    // 1. The create button is the permission boundary. It renders on
    //    `can_manage_placements`, so a volunteer who owns nothing sees it on a
    //    pet the group holds.
    await gotoApp(volunteer.page, `/pets/${String(petId)}`)
    await expect(volunteer.page.getByRole('heading', { name: petName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(
      volunteer.page.getByRole('button', { name: 'Create Request', exact: true })
    ).toBeVisible({ timeout: 10000 })

    const requestId = await createRequestViaDialog(volunteer.page, {
      typeLabel: 'Permanent',
      notes: `E2E permanent for ${petName} (listed by a volunteer)`,
    })

    // 2. The volunteer gets the owner layout on their own listing, and is
    //    therefore not offered the helper's side of it. A rescue applying to
    //    its own advert is the shape decision 4 rules out.
    await openRequestDetail(volunteer.page, requestId)
    await expect(
      volunteer.page.getByRole('button', { name: 'Delete Placement Request' })
    ).toBeVisible({ timeout: 10000 })
    await expect(volunteer.page.getByRole('button', { name: 'Send Response' })).toHaveCount(0)

    await respondAsHelper(adopter.page, requestId, `I would love to adopt ${petName}.`)

    // 3. The responder is talking to an organisation, and the thread says so
    //    rather than naming whichever volunteer answered first.
    await adopter.page.getByRole('button', { name: 'Chat with Owner' }).click()
    await expect(adopter.page).toHaveURL(/\/messages\/\d+$/, { timeout: 10000 })
    await expect(adopter.page.getByRole('heading', { name: groupName, level: 3 })).toBeVisible({
      timeout: 10000,
    })
    // Admin, volunteer and the adopter: everyone in the group reads this.
    await expect(
      adopter.page.getByText('3 people from this group can read this', { exact: true })
    ).toBeVisible()

    // 4. The volunteer accepts, which is the decision that used to require
    //    being the pet's owner.
    await decideOnResponse(volunteer.page, requestId, ADOPTER.name, 'Accept')
    await expectRequestStatus(volunteer.page, 'Awaiting Handover')
    await expect(
      volunteer.page.getByText(`Waiting for ${ADOPTER.name} to confirm handover`, { exact: true })
    ).toBeVisible()

    await confirmHandoverAsHelper(adopter.page, requestId)
    await expectRequestStatus(adopter.page, 'Completed')

    // 5. Ownership moved to the adopter, and nobody else kept a live
    //    relationship. A permanent placement out of a group grants the previous
    //    owner no consolation `viewer` row — the mirror of the p2p case, where
    //    it does — because the adopter's cat must not stay readable by a rescue
    //    they have left.
    await gotoApp(adopter.page, `/pets/${String(petId)}`)
    await expect(
      adopter.page.getByRole('button', { name: 'Create Request', exact: true })
    ).toBeVisible({ timeout: 10000 })

    const currentPeople = adopter.page
      .getByRole('heading', { name: 'Current', exact: true })
      .locator('xpath=following-sibling::div[1]')
    await expect(currentPeople.getByText(`${ADOPTER.name}(you)`)).toBeVisible({ timeout: 10000 })
    await expect(currentPeople.getByText('Owner', { exact: true })).toHaveCount(1)
    await expect(currentPeople.getByText('Viewer', { exact: true })).toHaveCount(0)

    // 6. The pet left the group on finalization, so the volunteer can no longer
    //    act on it — but the rescue keeps the record of what it rehomed.
    await gotoApp(volunteer.page, `/groups/${String(groupId)}`)
    await expect(volunteer.page.getByRole('heading', { name: groupName, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    await expect(volunteer.page.getByText('No pets in this group.', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(petCard(volunteer.page, petId)).toHaveCount(0)

    // The group context lives behind the pet list's filter panel, which
    // remembers whether it was left open.
    await gotoApp(volunteer.page, '/')
    const filters = volunteer.page.getByRole('button', { name: 'Filters' })
    await expect(filters).toBeVisible({ timeout: 10000 })
    if ((await filters.getAttribute('aria-expanded')) !== 'true') {
      await filters.click()
    }

    const groupSelector = volunteer.page.getByTestId('group-context-selector')
    await expect(groupSelector).toBeVisible({ timeout: 10000 })
    await groupSelector.click()
    await volunteer.page.getByRole('option', { name: groupName, exact: true }).click()

    await expect(
      volunteer.page.getByRole('heading', { name: 'Rehomed by this group', exact: true })
    ).toBeVisible({ timeout: 10000 })
    await expect(petCard(volunteer.page, petId)).toBeVisible()
  })

  test('refuses to detach a pet from a group while its listing is live', async () => {
    const { petId, petName, groupId } = await setUpRescue()

    const requestId = await createPlacementRequestViaApi(volunteer.page, {
      petId,
      requestType: 'permanent',
      notes: `E2E permanent for ${petName} (detach guard)`,
    })

    // Removing the pet here would strip authority from the volunteers currently
    // handling responses, leaving a live public listing nobody can answer.
    const refused = await removeGroupPetViaApi(admin.page, groupId, petId)
    expect(refused.ok).toBeFalsy()
    expect(refused.status).toBe(422)

    // Once the listing is gone the pet detaches normally.
    expect((await deletePlacementRequestViaApi(volunteer.page, requestId)).ok).toBeTruthy()
    expect((await removeGroupPetViaApi(admin.page, groupId, petId)).ok).toBeTruthy()
  })
})
