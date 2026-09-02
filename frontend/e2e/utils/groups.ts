import { expect, type Page } from '@playwright/test'
import { apiRequest, apiRequestOrThrow } from './api'

export async function createGroupViaApi(
  page: Page,
  name: string,
  options?: { petIds?: number[] }
): Promise<number> {
  const groupId = await page.evaluate<number | null, { groupName: string; petIds: number[] }>(
    async ({ groupName, petIds }) => {
      const xsrfCookie = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]

      let createResponse: Response | null = null
      let createPayload:
        | { data?: { id?: number }; message?: string }
        | { id?: number; message?: string }
        | null = null

      for (let attempt = 0; attempt < 6; attempt += 1) {
        createResponse = await fetch('/api/groups', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(xsrfCookie ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie) } : {}),
          },
          body: JSON.stringify({
            name: groupName,
            ...(petIds.length > 0 ? { pet_ids: petIds } : {}),
          }),
        })

        createPayload = (await createResponse.json()) as
          | { data?: { id?: number }; message?: string }
          | { id?: number; message?: string }

        if (createResponse.ok) {
          break
        }

        if (createResponse.status !== 429 || attempt === 5) {
          const message = 'message' in createPayload ? createPayload.message : undefined
          throw new Error(
            `Failed to create group via API: ${String(createResponse.status)}${message ? ` ${message}` : ''}`
          )
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 1000 * (attempt + 1))
        })
      }

      if (!createResponse?.ok) {
        throw new Error('Failed to create group via API after retries')
      }

      const id =
        createPayload && 'data' in createPayload && createPayload.data?.id
          ? createPayload.data.id
          : createPayload && 'id' in createPayload
            ? createPayload.id
            : null

      return id ?? null
    },
    { groupName: name, petIds: options?.petIds ?? [] }
  )

  if (groupId == null) {
    throw new Error(`Group create response did not include an id for ${name}`)
  }

  return groupId
}

export async function openGroupSettings(page: Page, groupId: number, groupName: string) {
  await expect(page.getByRole('heading', { name: groupName, level: 1 })).toBeVisible({
    timeout: 10000,
  })
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/groups/${String(groupId)}/settings$`), {
    timeout: 10000,
  })
  await expect(page.getByRole('heading', { name: 'Group settings', level: 1 })).toBeVisible({
    timeout: 10000,
  })
}

interface GroupInvitationPayload {
  invitation?: { token?: string }
  invitation_url?: string
}

/**
 * Creates a join link for a group and returns its token.
 *
 * Adding a member directly is only allowed for someone the inviter already
 * collaborates with, which a freshly seeded pair of accounts is not. The
 * invitation is the path a real rescue uses anyway.
 */
export async function createGroupInvitationViaApi(
  page: Page,
  groupId: number,
  role: 'admin' | 'member' = 'member'
): Promise<string> {
  const payload = await apiRequestOrThrow<GroupInvitationPayload>(
    page,
    'POST',
    `/api/groups/${String(groupId)}/invitations`,
    { role }
  )

  const token = payload.invitation?.token
  if (!token) {
    throw new Error(`Group invitation response for group ${String(groupId)} carried no token`)
  }

  return token
}

/** Accepts a resource invitation as whoever `page` is signed in as. */
export async function acceptResourceInvitationViaApi(page: Page, token: string): Promise<void> {
  await apiRequestOrThrow(page, 'POST', `/api/resource-invitations/${token}/accept`)
}

/**
 * Puts `memberPage`'s user into the group as a member, driving both halves of
 * the invitation: the admin issues the link, the recipient redeems it.
 */
export async function joinGroupViaInvitation(
  adminPage: Page,
  memberPage: Page,
  groupId: number,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const token = await createGroupInvitationViaApi(adminPage, groupId, role)
  await acceptResourceInvitationViaApi(memberPage, token)
}

/**
 * Detaches a pet from a group, returning the outcome rather than throwing.
 *
 * Callers assert on the status: a refusal is a rule under test here, not a
 * broken fixture.
 */
export async function removeGroupPetViaApi(
  page: Page,
  groupId: number,
  petId: number
): Promise<{ ok: boolean; status: number }> {
  const result = await apiRequest(
    page,
    'DELETE',
    `/api/groups/${String(groupId)}/pets/${String(petId)}`
  )

  return { ok: result.ok, status: result.status }
}

/**
 * Leaves a group as whoever `page` is signed in as.
 *
 * Cleanup, so it reports rather than throws: a spec that has already made its
 * assertions should not fail over tidying up. It matters more than tidiness
 * though — an active shared membership makes two accounts collaborators, and
 * collaborators show up in every "Suggested" list for the rest of the run.
 */
export async function leaveGroupViaApi(
  page: Page,
  groupId: number
): Promise<{ ok: boolean; status: number }> {
  const result = await apiRequest(page, 'POST', `/api/groups/${String(groupId)}/leave`)

  return { ok: result.ok || result.status === 404, status: result.status }
}

/** Deletes a group as an admin. Cleanup, so it reports rather than throws. */
export async function deleteGroupViaApi(
  page: Page,
  groupId: number
): Promise<{ ok: boolean; status: number }> {
  const result = await apiRequest(page, 'DELETE', `/api/groups/${String(groupId)}`)

  return { ok: result.ok || result.status === 404, status: result.status }
}
