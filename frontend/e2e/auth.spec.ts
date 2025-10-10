import { test, expect } from '@playwright/test'

// Helpers
async function login(page: import('@playwright/test').Page, {
  email = 'user@example.com',
  password = 'password',
  remember = false,
}: { email?: string; password?: string; remember?: boolean } = {}) {
  // Intercept CSRF and login calls
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/login', async (route) => {
    // Basic body validation
    const body = JSON.parse(route.request().postData() ?? '{}') as { email?: string; password?: string }
    if (body.email === email && body.password === password) {
      await route.fulfill({ status: 204, body: '' })
    } else {
      await route.fulfill({ status: 422, body: JSON.stringify({ message: 'Invalid credentials' }) })
    }
  })

  // After login, AuthContext.loadUser calls /api/users/me
  await page.route('**/api/users/me', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { id: 1, name: 'Test User', email } }),
    })
  )

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  if (remember) await page.getByLabel('Remember me').check()
  await page.getByRole('button', { name: 'Login' }).click()
}

// 4.2 Auth flow test (register→login→logout)
// We implement login→logout; register page already exercises toast/navigate,
// and can be added similarly by stubbing /api/register

test('login redirects to account/pets and logout returns to login', async ({ page }) => {
  await login(page)

  // Expect redirect to /account/pets
  await expect(page).toHaveURL(/\/account\/pets/)

  // Stub logout API
  await page.route('**/api/logout', (route) => route.fulfill({ status: 204, body: '' }))

  // Navigate to profile and click Logout (we go via nav)
  await page.goto('/account')
  await page.getByRole('button', { name: /logout/i }).click()

  // After logout, app navigates to /login
  await expect(page).toHaveURL(/\/login$/)
})
