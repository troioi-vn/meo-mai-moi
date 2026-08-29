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
    if (!response) {
      throw new Error('no response for /')
    }
    expect(response.status(), 'home page did not return 2xx').toBeLessThan(300)
    await expect(page).toHaveTitle(/Meo Mai Moi/i)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('reports a version', async ({ request }) => {
    const response = await request.get('/api/version')
    expect(response.ok(), `/api/version returned ${response.status()}`).toBe(true)

    const body: unknown = await response.json()
    const version =
      typeof body === 'object' &&
      body !== null &&
      'data' in body &&
      typeof body.data === 'object' &&
      body.data !== null &&
      'version' in body.data
        ? body.data.version
        : undefined

    expect(version, `unexpected shape: ${JSON.stringify(body)}`).toBeTruthy()

    // Surfaced in the report so a human can see what was live for this run.
    test.info().annotations.push({ type: 'app-version', description: String(version) })
  })

  test('does not let the browser cache the installed app shell', async ({ request }) => {
    // /build/index.html is the manifest start_url, so an installed client asks
    // for it on every launch. It names the content-hashed chunks of one build,
    // and the next deploy deletes those chunks. Serve it with a lifetime and a
    // returning client boots a shell whose lazy routes 404 until the cache
    // expires - the "a new version is available" screen with no way past it.
    const response = await request.get('/build/index.html')
    expect(response.ok(), `app shell returned ${response.status()}`).toBe(true)

    const cacheControl = response.headers()['cache-control'] ?? ''
    expect(cacheControl, `app shell is cacheable: "${cacheControl}"`).toMatch(
      /no-cache|no-store|max-age=0/
    )

    // The counterpart: hashed chunks are safe to keep forever, and the shell is
    // useless without them being cheap.
    const shell = await response.text()
    const asset = /\/build\/assets\/[\w.-]+\.js/.exec(shell)?.[0]
    expect(asset, 'app shell references no hashed asset').toBeTruthy()

    const assetResponse = await request.get(asset ?? '')
    expect(assetResponse.ok(), `${String(asset)} returned ${assetResponse.status()}`).toBe(true)
    expect(assetResponse.headers()['cache-control'] ?? '').toContain('immutable')
  })

  test('serves the manifest an installed Android app checks for updates', async ({ request }) => {
    // Chrome re-reads the manifest linked from start_url (/build/index.html) to
    // decide whether an installed WebAPK needs a new launcher icon. That copy
    // lives under /build/ and is easy to break separately from the root one:
    // `location ^~ /build/` makes nginx skip every regex location, so a regex
    // rule for it silently never runs and it goes out as octet-stream.
    const shell = await request.get('/build/index.html')
    expect(shell.ok(), `app shell returned ${shell.status()}`).toBe(true)

    const linked = /<link[^>]+rel="manifest"[^>]+href="([^"]+)"/.exec(await shell.text())?.[1]
    expect(linked, 'app shell links no manifest').toBeTruthy()

    const response = await request.get(linked ?? '')
    expect(response.ok(), `${String(linked)} returned ${response.status()}`).toBe(true)

    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType, `${String(linked)} served as "${contentType}"`).toContain('manifest')

    const manifest = (await response.json()) as {
      id?: string
      icons?: { src: string; purpose?: string }[]
    }
    expect(manifest.id, 'stable app identity keeps the install from splitting').toBe('/')

    // Android draws the launcher icon from the maskable one; if it 404s the
    // WebAPK cannot be re-minted with new artwork.
    const maskable = manifest.icons?.find((icon) => icon.purpose === 'maskable')
    expect(maskable, 'manifest declares no maskable icon').toBeTruthy()

    const iconResponse = await request.get(maskable?.src ?? '')
    expect(iconResponse.ok(), `${String(maskable?.src)} returned ${iconResponse.status()}`).toBe(
      true
    )
    expect(iconResponse.headers()['content-type'] ?? '').toContain('image/png')
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

    const manifest: unknown = await response.json()
    const name =
      typeof manifest === 'object' && manifest !== null
        ? 'name' in manifest
          ? manifest.name
          : 'short_name' in manifest
            ? manifest.short_name
            : undefined
        : undefined
    expect(name).toBeTruthy()
  })
})
