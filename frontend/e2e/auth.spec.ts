import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const TEST_USER = {
  name: 'Test User',
  email: 'testuser@example.com',
  password: 'password',
}

async function stubAuthNetwork(page: Page) {
  // CSRF cookie
  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({ status: 204, body: '' })
  })

  // Public settings: open registration by default
  await page.route('**/api/settings/public', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { invite_only_enabled: false } }),
    })
  })

  // Register
  await page.route('**/register', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const body = (await route.request().postDataJSON()) as {
      name?: string
      email?: string
      password?: string
      password_confirmation?: string
    }
    if (!body?.email || !body?.password || !body?.password_confirmation) {
      return route.fulfill({ status: 422, body: JSON.stringify({ message: 'Invalid' }) })
    }
    return route.fulfill({
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          user: {
            id: 1,
            name: body.name ?? TEST_USER.name,
            email: body.email ?? TEST_USER.email,
            email_verified_at: new Date().toISOString(),
          },
          email_verified: true,
          email_sent: false,
          requires_verification: false,
          message: 'ok',
        },
      }),
    })
  })

  // Login
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const body = (await route.request().postDataJSON()) as { email?: string; password?: string }
    if (body?.email === TEST_USER.email && body?.password === TEST_USER.password) {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            user: {
              id: 1,
              name: TEST_USER.name,
              email: TEST_USER.email,
              email_verified_at: new Date().toISOString(),
            },
            two_factor: false,
          },
        }),
      })
    }
    return route.fulfill({
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Unauthorized' }),
    })
  })

  // Logout
  await page.route('**/logout', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    await route.fulfill({ status: 200, body: JSON.stringify({ message: 'ok' }) })
  })

  // Current user
  let authenticated = false

  await page.route('**/api/users/me', async (route) => {
    if (authenticated) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 1, name: TEST_USER.name, email: TEST_USER.email } }),
      })
    }
    return route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthenticated.' }) })
  })

  // Track authentication state by observing login/logout
  page.on('requestfinished', async (req) => {
    if (req.url().includes('/login') && req.method() === 'POST') {
      const res = await req.response()
      authenticated = res?.status() === 200
    }
    if (req.url().includes('/logout') && req.method() === 'POST') {
      authenticated = false
    }
  })
}

async function goto(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('#root')).toBeVisible()
}

// 4.2 Auth flow test (register→login→logout)
test('auth flow: register → login → logout', async ({ page }) => {
  await stubAuthNetwork(page)

  // Register
  await goto(page, '/register')
  await page.getByLabel('Name').fill(TEST_USER.name)
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_USER.password)
  await page.getByLabel('Confirm Password', { exact: true }).fill(TEST_USER.password)
  // Click the form submit button specifically
  await page.locator('form').getByRole('button', { name: 'Register', exact: true }).click()

  // After register, navigate to login per app behavior
  await goto(page, '/login')

  // Login
  await login(page, { email: TEST_USER.email, password: TEST_USER.password })

  // Expect landing on default path after login
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)

  // Open user menu and logout
  await page.getByRole('img', { name: TEST_USER.name }).click()
  await page.getByRole('menuitem', { name: /log out/i }).click()

  // Confirm logout in the dialog
  await page.getByRole('button', { name: /log out/i }).click()

  // Back to login
  await expect(page).toHaveURL(/\/login/)
})

// Helpers
async function login(
  page: Page,
  {
    email = 'user@example.com',
    password = 'password',
    remember = false,
  }: { email?: string; password?: string; remember?: boolean } = {}
) {
  // Intercept CSRF and login calls
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/check-email', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { exists: true } }),
    })
  )

  let authenticated = false

  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    // Basic body validation
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      email?: string
      password?: string
    }
    if (body.email === email && body.password === password) {
      authenticated = true
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            user: {
              id: 1,
              name: 'Test User',
              email,
              email_verified_at: new Date().toISOString(),
            },
            two_factor: false,
          },
        }),
      })
    } else {
      await route.fulfill({
        status: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid credentials' }),
      })
    }
  })

  // AuthContext.loadUser calls /api/users/me both before and after login
  await page.route('**/api/users/me', (route) => {
    if (authenticated) {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { id: 1, name: 'Test User', email } }),
      })
    }
    return route.fulfill({ status: 401, body: JSON.stringify({ message: 'Unauthenticated.' }) })
  })

  await page.goto('/login')
  await expect(page.locator('#root')).toBeVisible()
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByRole('button', { name: /next/i }).click()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(password)
  if (remember) await page.getByLabel('Remember me', { exact: true }).check()
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click()
}

// 4.2 Auth flow test (register→login→logout)
// We implement login→logout; register page already exercises toast/navigate,
// and can be added similarly by stubbing /api/register

test('login redirects to home and logout returns to login', async ({ page }) => {
  await login(page)

  // Expect redirect to /
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)

  // Stub logout API
  await page.route('**/logout', (route) => {
    if (route.request().method() !== 'POST') {
      return route.fallback()
    }
    return route.fulfill({ status: 204, body: '' })
  })

  // Navigate to settings and click Logout (we go via nav)
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/settings\/account/)
  const logoutButton = page.getByRole('button', { name: /log out/i })
  await expect(logoutButton).toBeVisible()
  await logoutButton.click()

  // After logout, app navigates to /login
  await expect(page).toHaveURL(/\/login$/)
})
