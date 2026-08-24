import { test, expect } from '@playwright/test'

/**
 * Deployment verification. Runs BEFORE the demo is reseeded, and is read-only.
 *
 * If any of this fails the runner aborts: the demo is not wiped and the suite
 * does not run. There is no reason to clear a public demo in order to test an
 * application that is not serving.
 *
 * Note on scope: `/api/version` reports `config('version.api')`, a release tag
 * that does not change per development commit, so it cannot prove which commit
 * is live. That check is authoritative only from the deploy host, where the
 * active slot's container image can be compared against the expected tag, and
 * `utils/e2e-run.sh` does it there before invoking this file. What these tests
 * cover is the part only an external client can see: TLS, routing, the app
 * shell, and the real manifest.
 *
 * See docs/e2e-ci.md.
 */
test.describe('deployment verification @deployment', () => {
  test('serves the app shell over a valid certificate', async ({ page }) => {
    const response = await page.goto('/')

    expect(response, 'no response for /').not.toBeNull()
    expect(response!.status(), 'home page did not return 2xx').toBeLessThan(300)
    await expect(page).toHaveTitle(/Meo Mai Moi/i)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('reports a version', async ({ request }) => {
    const response = await request.get('/api/version')
    expect(response.ok(), `/api/version returned ${response.status()}`).toBe(true)

    const body = await response.json()
    const version = body?.data?.version

    expect(version, `unexpected shape: ${JSON.stringify(body)}`).toBeTruthy()

    // Surfaced in the report so a human can see what was live for this run.
    test.info().annotations.push({ type: 'app-version', description: String(version) })
  })

  test('serves the real PWA manifest', async ({ request }) => {
    // Deliberately the concrete filename from index.html. A wrong path here
    // returns 200 text/html from the SPA fallback, which would make this test
    // pass against a manifest that does not exist.
    const response = await request.get('/site-light.webmanifest')
    expect(response.ok(), `manifest returned ${response.status()}`).toBe(true)

    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType, `manifest served as "${contentType}" — likely the SPA fallback`).toContain(
      'manifest'
    )

    const manifest = await response.json()
    expect(manifest.name ?? manifest.short_name).toBeTruthy()
  })
})
