import { expect, test, type Page } from '@playwright/test'
import { gotoApp } from './utils/app'
import { createPetViaApi } from './utils/pets'
import {
  createPlacementRequestViaApi,
  expectRequestStatus,
  openRequestDetail,
  openSession,
  type PlacementRequestType,
  type TestCredentials,
  type UserSession,
} from './utils/placement'

const OWNER: TestCredentials = {
  email: 'user1@catarchy.space',
  password: 'password',
  name: 'Support 🐱',
}

// Seeded helper profile accepts `permanent` and `foster_free`.
const ADOPTER: TestCredentials = {
  email: 'invitee@catarchy.space',
  password: 'password',
  name: 'Trusted Friend',
}

// Seeded helper profile accepts `foster_paid` and `pet_sitting`.
const SITTER: TestCredentials = {
  email: 'demo@catarchy.space',
  password: 'password',
  name: 'Demo Caregiver',
}

async function createRequest(ownerPage: Page, requestType: PlacementRequestType, label: string) {
  const petName = `${label} ${String(Date.now())}`
  const { petId } = await createPetViaApi(ownerPage, petName)
  const requestId = await createPlacementRequestViaApi(ownerPage, {
    petId,
    requestType,
    notes: `E2E ${requestType} for ${petName}`,
    endDateOffsetDays: requestType === 'permanent' ? undefined : 14,
  })

  return { petId, petName, requestId }
}

async function respondAsHelper(page: Page, requestId: number, message: string) {
  await openRequestDetail(page, requestId)
  await expect(page.getByText('Your Response', { exact: true })).toBeVisible({ timeout: 10000 })

  const sendResponse = page.getByRole('button', { name: 'Send Response' })
  await expect(sendResponse).toBeEnabled({ timeout: 10000 })
  await page
    .getByPlaceholder("Introduce yourself and explain why you'd like to help...")
    .fill(message)

  const responseCreated = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/placement-requests\/\d+\/responses$/.test(response.url())
  )
  await sendResponse.click()
  expect((await responseCreated).ok()).toBeTruthy()

  await expect(page.getByText('Pending Review', { exact: true })).toBeVisible({ timeout: 10000 })
}

async function decideAsOwner(
  page: Page,
  requestId: number,
  helperName: string,
  decision: 'Accept' | 'Reject'
) {
  await openRequestDetail(page, requestId)
  await expect(page.getByRole('button', { name: helperName })).toBeVisible({ timeout: 10000 })

  const decided = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new RegExp(`/api/placement-responses/\\d+/${decision.toLowerCase()}$`).test(response.url())
  )
  await page.getByRole('button', { name: decision, exact: true }).click()
  expect((await decided).ok()).toBeTruthy()
}

async function confirmHandoverAsHelper(page: Page, requestId: number) {
  await openRequestDetail(page, requestId)
  await expect(page.getByText('Your response was accepted!', { exact: true })).toBeVisible({
    timeout: 10000,
  })

  const confirmed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/transfer-requests\/\d+\/confirm$/.test(response.url())
  )
  await page.getByRole('button', { name: 'Confirm Handover' }).click()
  expect((await confirmed).ok()).toBeTruthy()
}

async function finalizeAsOwner(page: Page, requestId: number) {
  await openRequestDetail(page, requestId)

  await page.getByRole('button', { name: 'Pet is Returned' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible({ timeout: 10000 })

  const finalized = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/placement-requests\/\d+\/finalize$/.test(response.url())
  )
  await dialog.getByRole('button', { name: 'Confirm Return' }).click()
  expect((await finalized).ok()).toBeTruthy()
}

test.describe('Placement request lifecycle', () => {
  // Every test drives three signed-in participants through several round trips,
  // so the default 30s budget is not enough even on a healthy stack.
  test.describe.configure({ mode: 'serial', timeout: 120 * 1000 })

  let owner: UserSession
  let adopter: UserSession
  let sitter: UserSession

  test.beforeAll(async ({ browser }) => {
    owner = await openSession(browser, OWNER)
    adopter = await openSession(browser, ADOPTER)
    sitter = await openSession(browser, SITTER)
  })

  test.afterAll(async () => {
    await Promise.all([owner.context.close(), adopter.context.close(), sitter.context.close()])
  })

  test('carries a permanent placement from response through handover to new ownership', async () => {
    const { petId, petName, requestId } = await createRequest(owner.page, 'permanent', 'Adopt Me')

    await respondAsHelper(adopter.page, requestId, `I would love to adopt ${petName}.`)

    await decideAsOwner(owner.page, requestId, ADOPTER.name, 'Accept')
    await expectRequestStatus(owner.page, 'Awaiting Handover')
    await expect(
      owner.page.getByText(`Waiting for ${ADOPTER.name} to confirm handover`, { exact: true })
    ).toBeVisible()

    await confirmHandoverAsHelper(adopter.page, requestId)
    await expectRequestStatus(adopter.page, 'Completed')

    await openRequestDetail(owner.page, requestId)
    await expectRequestStatus(owner.page, 'Completed')

    // Ownership moved: the adopter now holds the owner relationship and gets the
    // owner-only affordances on the pet itself.
    //
    // The mirror assertion — that the former owner is left with the read-only
    // view — is deliberately absent: the seeded owner account carries the admin
    // role, which keeps edit access on every pet regardless of relationship.
    await gotoApp(adopter.page, `/pets/${String(petId)}`)
    await expect(
      adopter.page.getByRole('button', { name: 'Create Request', exact: true })
    ).toBeVisible({ timeout: 10000 })

    // The "Current" block of the People card holds only live relationships: one
    // owner, who is the adopter, plus the read-only viewer row the transfer
    // leaves the previous owner. Asserted by role rather than by name, because
    // the seeded owner account gets renamed by the profile spec.
    const currentPeople = adopter.page
      .getByRole('heading', { name: 'Current', exact: true })
      .locator('xpath=following-sibling::div[1]')
    await expect(currentPeople.getByText(`${ADOPTER.name}(you)`)).toBeVisible({ timeout: 10000 })
    await expect(currentPeople.getByText('Owner', { exact: true })).toHaveCount(1)
    await expect(currentPeople.getByText('Viewer', { exact: true })).toHaveCount(1)
  })

  test('runs a free foster from handover through the owner marking the pet returned', async () => {
    const { petName, requestId } = await createRequest(owner.page, 'foster_free', 'Foster Me')

    await respondAsHelper(adopter.page, requestId, `I can foster ${petName}.`)

    await decideAsOwner(owner.page, requestId, ADOPTER.name, 'Accept')
    await expectRequestStatus(owner.page, 'Awaiting Handover')

    await confirmHandoverAsHelper(adopter.page, requestId)
    await expectRequestStatus(adopter.page, 'Active')
    await expect(
      adopter.page.getByText(`You are currently caring for ${petName}`, { exact: true })
    ).toBeVisible({ timeout: 10000 })

    await finalizeAsOwner(owner.page, requestId)
    await expectRequestStatus(owner.page, 'Completed')

    await openRequestDetail(adopter.page, requestId)
    await expectRequestStatus(adopter.page, 'Completed')
  })

  test('activates pet sitting on acceptance without a handover step', async () => {
    const { petName, requestId } = await createRequest(owner.page, 'pet_sitting', 'Sit For Me')

    await respondAsHelper(sitter.page, requestId, `I can sit for ${petName}.`)

    await decideAsOwner(owner.page, requestId, SITTER.name, 'Accept')

    // pet_sitting skips the TransferRequest entirely: acceptance is the handover.
    await expectRequestStatus(owner.page, 'Active')
    await expect(owner.page.getByText('Awaiting Handover', { exact: true })).toHaveCount(0)
    await expect(
      owner.page.getByText('Pet is currently with sitter', { exact: true })
    ).toBeVisible()

    await openRequestDetail(sitter.page, requestId)
    await expect(sitter.page.getByRole('button', { name: 'Confirm Handover' })).toHaveCount(0)
    await expect(
      sitter.page.getByText(`You are currently caring for ${petName}`, { exact: true })
    ).toBeVisible({ timeout: 10000 })

    await finalizeAsOwner(owner.page, requestId)
    await expectRequestStatus(owner.page, 'Completed')
  })

  test('lets an owner reject a response while the request stays open', async () => {
    const { petName, requestId } = await createRequest(owner.page, 'permanent', 'Reject Me')

    await respondAsHelper(adopter.page, requestId, `Happy to help ${petName}.`)

    await decideAsOwner(owner.page, requestId, ADOPTER.name, 'Reject')
    await expectRequestStatus(owner.page, 'Open')
    await expect(owner.page.getByText('No pending responses yet.', { exact: true })).toBeVisible({
      timeout: 10000,
    })

    await openRequestDetail(adopter.page, requestId)
    await expect(adopter.page.getByText('Rejected', { exact: true })).toBeVisible({
      timeout: 10000,
    })
    await expect(adopter.page.getByRole('button', { name: 'Cancel My Response' })).toHaveCount(0)
  })

  test('lets a helper withdraw their own response', async () => {
    const { petName, requestId } = await createRequest(
      owner.page,
      'foster_free',
      'Withdraw From Me'
    )

    await respondAsHelper(adopter.page, requestId, `Offering to foster ${petName}.`)

    const cancelled = adopter.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/api\/placement-responses\/\d+\/cancel$/.test(response.url())
    )
    await adopter.page.getByRole('button', { name: 'Cancel My Response' }).click()
    const confirmDialog = adopter.page.getByRole('alertdialog')
    await expect(confirmDialog).toBeVisible({ timeout: 10000 })
    await confirmDialog.getByRole('button', { name: 'Yes, cancel my response' }).click()
    expect((await cancelled).ok()).toBeTruthy()

    await expect(adopter.page.getByText('Cancelled', { exact: true })).toBeVisible({
      timeout: 10000,
    })

    await openRequestDetail(owner.page, requestId)
    await expectRequestStatus(owner.page, 'Open')
    await expect(owner.page.getByText('No pending responses yet.', { exact: true })).toBeVisible({
      timeout: 10000,
    })
  })
})
