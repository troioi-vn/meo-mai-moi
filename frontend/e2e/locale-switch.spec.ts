import { expect, test } from '@playwright/test'
import { gotoApp, login } from './utils/app'
import { createPetWithRequest, deletePlacementRequestViaApi } from './utils/placement'

const OWNER = {
  email: 'user1@catarchy.space',
  password: 'password',
}

test.describe('Locale switching', () => {
  /**
   * The notes on a placement request are rendered by the server for the
   * `Accept-Language` of the request that fetched them, and React Query keys
   * carry no locale. Without a cache invalidation on `languageChanged` the
   * chrome switches language while the notes stay in the previous one until the
   * page is reloaded.
   *
   * The assertion is the refetch rather than translated notes: the actual
   * translation is produced asynchronously by an external model, so the text
   * that comes back is not something a deployment-agnostic test can pin.
   */
  test('refetches server-rendered content when a visitor changes language', async ({
    page,
    browser,
    baseURL,
  }) => {
    await login(page, OWNER.email, OWNER.password)
    const { requestId } = await createPetWithRequest(page, 'permanent', 'locale switch')

    const visitorContext = await browser.newContext({ baseURL })
    try {
      const visitor = await visitorContext.newPage()
      await gotoApp(visitor, `/requests/${String(requestId)}`)
      await expect(visitor.getByText('Notes', { exact: true })).toBeVisible({ timeout: 10000 })

      const refetchedInRussian = visitor.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new RegExp(`/api/placement-requests/${String(requestId)}$`).test(response.url()) &&
          (response.request().headers()['accept-language'] ?? '').startsWith('ru')
      )

      await visitor.getByRole('button', { name: 'EN', exact: true }).click()
      await visitor.getByRole('menuitem', { name: 'Русский', exact: true }).click()

      expect((await refetchedInRussian).ok()).toBeTruthy()
      await expect(visitor.getByText('Заметки', { exact: true })).toBeVisible({ timeout: 10000 })
    } finally {
      await visitorContext.close()
    }

    // The dev deployment is a public demo; take the request back off /requests.
    expect((await deletePlacementRequestViaApi(page, requestId)).ok).toBeTruthy()
  })
})
