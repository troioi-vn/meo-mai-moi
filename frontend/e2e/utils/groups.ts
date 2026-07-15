import { expect, type Page } from '@playwright/test'

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
          const message =
            createPayload && 'message' in createPayload ? createPayload.message : undefined
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
