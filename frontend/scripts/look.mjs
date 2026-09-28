import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { chromium, devices, expect } from '@playwright/test'

const [route = '/', ...clicks] = process.argv.slice(2)
if (route === '--help' || route === '-h') {
  console.log(`Usage: utils/look.sh [path] ["Button name" ...]

Signs in as the seeded demo user, then saves a viewport screenshot and one
more after each exact button-name click. Clicks can change application data.

Examples:
  utils/look.sh /finance "Add expense"
  LOOK_DEVICE="iPhone 15" utils/look.sh /
  LOOK_AUTH=guest utils/look.sh /login

Environment:
  PLAYWRIGHT_BASE_URL  Running app origin (default http://localhost:8000)
  LOOK_AUTH            demo (default), user, or guest
  LOOK_EMAIL           Required with LOOK_AUTH=user
  LOOK_PASSWORD        Required with LOOK_AUTH=user
  LOOK_DEVICE          Playwright device name, emulated with Chromium
  LOOK_WIDTH           Viewport width (default 1440, or device width)
  LOOK_HEIGHT          Viewport height (default 900, or device height)
  LOOK_FULL_PAGE       1 to capture the whole page (default 0)
  LOOK_SETTLE_MS       Extra delay after network settles (default 1000)
  LOOK_OUT             Output parent (default system temporary directory)

Each run creates a fresh meomaimoi-look-* directory and prints absolute paths.
Requires frontend dependencies and Chromium: cd frontend && bun x playwright install chromium
Redeploy with ./utils/deploy.sh before checking UI changes on port 8000.
See docs/development.md#looking-at-the-app.`)
  process.exit(0)
}

function number(name, fallback, minimum = 1) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name])
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`)
  }
  return value
}

async function look() {
  const baseURL = new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000')
  if (!['http:', 'https:'].includes(baseURL.protocol)) {
    throw new Error('PLAYWRIGHT_BASE_URL must be an HTTP or HTTPS origin')
  }
  const target = new URL(route, baseURL)
  if (!route.startsWith('/') || route.startsWith('//') || target.origin !== baseURL.origin) {
    throw new Error('Use an app-relative path such as /finance')
  }
  const auth = process.env.LOOK_AUTH || 'demo'
  if (!['demo', 'user', 'guest'].includes(auth)) {
    throw new Error('LOOK_AUTH must be demo, user, or guest')
  }
  const email = auth === 'demo' ? 'demo@catarchy.space' : process.env.LOOK_EMAIL
  const password = auth === 'demo' ? 'password' : process.env.LOOK_PASSWORD
  if (auth === 'user' && (!email || !password)) {
    throw new Error('LOOK_AUTH=user requires LOOK_EMAIL and LOOK_PASSWORD')
  }
  const deviceName = process.env.LOOK_DEVICE || 'Desktop Chrome'
  const device = devices[deviceName]
  if (!device) throw new Error(`Unknown LOOK_DEVICE: ${deviceName}`)
  const viewport = process.env.LOOK_DEVICE ? device.viewport : { width: 1440, height: 900 }
  const width = number('LOOK_WIDTH', viewport.width)
  const height = number('LOOK_HEIGHT', viewport.height)
  const settleMs = number('LOOK_SETTLE_MS', 1000, 0)
  const fullPage = process.env.LOOK_FULL_PAGE || '0'
  if (!['0', '1'].includes(fullPage)) throw new Error('LOOK_FULL_PAGE must be 0 or 1')
  const parent = resolve(process.env.LOOK_OUT || tmpdir())
  await mkdir(parent, { recursive: true })
  const out = await mkdtemp(join(parent, 'meomaimoi-look-'))
  console.log(`Screenshots: ${out}`)

  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      ...device,
      viewport: { width, height },
      baseURL: baseURL.origin,
      locale: 'en-US',
      colorScheme: 'light',
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    page.setDefaultTimeout(20_000)
    page.setDefaultNavigationTimeout(30_000)
    page.on('pageerror', (error) => console.error(`Browser error: ${error.message}`))
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'))

    async function navigate(url) {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
      if (response && !response.ok()) {
        throw new Error(`Navigation failed: HTTP ${response.status()} at ${page.url()}`)
      }
    }

    if (auth !== 'guest') {
      await navigate('/login')
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.locator('form button[type="submit"]').click()
      await expect(page).toHaveURL(`${baseURL.origin}/`, { timeout: 20_000 })
      // Verify the session before navigating, so a failed login cannot masquerade as a screenshot.
      const session = await context.request.get('/api/user', {
        headers: { Accept: 'application/json', Origin: baseURL.origin, Referer: page.url() },
      })
      if (!session.ok())
        throw new Error(`Login did not establish a session: HTTP ${session.status()}`)
    }

    await navigate(target.href)
    await expect(page.locator('#root')).toBeVisible()
    async function capture(name) {
      await page.waitForLoadState('networkidle', { timeout: 20_000 })
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      await page.waitForTimeout(settleMs)
      const file = join(out, name)
      await page.screenshot({ path: file, fullPage: fullPage === '1', animations: 'disabled' })
      console.log(`${file}  ${page.url()}`)
    }
    await capture('0-page.png')
    for (const [index, name] of clicks.entries()) {
      // Ambiguous buttons should fail visibly, rather than clicking an arbitrary match.
      await page.getByRole('button', { name, exact: true }).click()
      const safeName = name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 60) || 'button'
      await capture(`${index + 1}-${safeName}.png`)
    }
  } finally {
    await browser.close()
  }
}

look().catch((error) => {
  console.error(`look: ${error.message}`)
  process.exitCode = 1
})
