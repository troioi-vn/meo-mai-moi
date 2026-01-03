# E2E Testing with Email Verification Guide

This guide covers best practices for end-to-end testing with email verification in a containerized environment.

## Overview

Our e2e testing setup uses:
- **Playwright** for browser automation
- **MailHog** for email capture and testing
- **Docker Compose** with testing profiles
- **Real backend services** (not mocked) for authentic testing

## Quick Start

```bash
# Run e2e tests with automatic cleanup
cd frontend && npm run test:e2e

# Run tests with visible browser for debugging
cd frontend && npm run test:e2e -- --headed

# Run tests with interactive UI mode
cd frontend && npm run test:e2e -- --ui

# Run tests and keep services running for debugging
cd frontend && npm run test:e2e -- --keep-running

# Run specific test file with visible browser
cd frontend && npm run test:e2e -- --headed auth.spec.ts
```

## Architecture

### Email Testing Flow

1. **E2E seeder configures MailHog** as active email provider in database
2. **MailHog captures emails** sent by Laravel during registration
3. **Test waits for email** using MailHog API polling
4. **Verification URL extracted** from email content
5. **Browser visits URL** to complete verification
6. **Test verifies** user can access protected routes

### Database-Driven Email Configuration

The app uses `EmailConfiguration` model to manage email settings, which override `.env` values. For e2e testing:

- `E2EEmailConfigurationSeeder` creates and activates MailHog SMTP config
- `E2ETestingSeeder` orchestrates all necessary seeders for complete test environment
- `email:verify-config` command helps debug email configuration issues

### Service Dependencies

```yaml
# docker-compose.yml profiles
services:
  mailhog:
    profiles: [testing, e2e]  # Only runs with --profile e2e
    ports:
      - "1025:1025"  # SMTP server
      - "8025:8025"  # Web UI for debugging
```

## Best Practices

### 1. **Ensure Login Functions Wait for Redirects**

Always ensure your login utility functions wait for the authentication redirect to complete:

```typescript
// ✅ Good: Login function waits for redirect
export async function login(page: Page, email: string, password: string) {
  await gotoApp(page, '/login')
  // ... login form filling ...
  await page.locator('form').getByRole('button', { name: 'Login', exact: true }).click()
  // Wait for successful login and redirect to home
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, { timeout: 10000 })
}

// ❌ Bad: Login function doesn't wait for redirect
export async function login(page: Page, email: string, password: string) {
  // ... login form filling and submit ...
  // Missing: No wait for redirect completion!
}
```

**Why this matters**: Tests will fail if they navigate immediately after login without waiting for the redirect.

### 2. **Use Real Email Services in Tests**

✅ **Good**: Test with actual email sending
```typescript
// Wait for real email from MailHog
const email = await mailhog.waitForEmail(user.email, {
  timeout: 15000,
  subject: 'Verify'
})
```

❌ **Avoid**: Mocking email verification entirely
```typescript
// This doesn't test the real flow
await page.route('**/verify-email', () => ({ status: 200 }))
```

### 2. **Use Real Email Services in Tests**

✅ **Good**: Test with actual email sending
```typescript
// Wait for real email from MailHog
const email = await mailhog.waitForEmail(user.email, {
  timeout: 15000,
  subject: 'Verify'
})
```

❌ **Avoid**: Mocking email verification entirely
```typescript
// This doesn't test the real flow
await page.route('**/verify-email', () => ({ status: 200 }))
```

### 3. **Clean State Between Tests**

```typescript
test.beforeEach(async () => {
  mailhog = new MailHogClient()
  await mailhog.clearMessages() // Clear previous emails
})
```

### 4. **Use Dedicated Test Database**

```bash
# E2E tests use separate database
DB_DATABASE=meo_mai_moi_test
```

### 6. **Handle Timing Issues**

```typescript
// Wait for email with reasonable timeout
const email = await mailhog.waitForEmail(userEmail, {
  timeout: 15000,  // 15 seconds
  interval: 1000,  // Check every second
  subject: 'Verify Email'
})
```

### 8. **Test Edge Cases**

```typescript
test('handles invalid verification link', async ({ page }) => {
  await page.goto('/email/verify/999/invalid-signature')
  await expect(page.getByText(/invalid|expired/i)).toBeVisible()
})
```

### 10. **Handle Complex Form Interactions**

For forms with dynamic components like city selection that allow creating new entries:

```typescript
// City selection with creation
test('creates pet with new city', async ({ page }) => {
  await login(page, TEST_USER.email, TEST_USER.password)
  await page.goto('/pets/create')

  // Fill basic pet info
  await page.getByLabel('Name').fill('Test Pet')

  // Handle city selection - create new city if needed
  await page.getByText('Select city').click()
  await page.getByPlaceholder('Search cities...').fill('New Test City')
  await page.getByText('Create: "New Test City"').click()

  await page.getByRole('button', { name: 'Create Pet' }).click()
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
})
```

**Note**: Components like `CitySelect` may have complex interactions involving dropdowns, search, and creation. Test these thoroughly.

### 12. **Test Form Validation**

Validate that required fields show appropriate error messages:

```typescript
test('validates required fields', async ({ page }) => {
  await login(page, TEST_USER.email, TEST_USER.password)
  await page.goto('/pets/create')

  // Submit empty form
  await page.getByRole('button', { name: 'Create Pet' }).click()

  // Check for validation errors
  await expect(page.getByText('Name is required')).toBeVisible()
  await expect(page.getByText('City is required')).toBeVisible()
})
```

### 13. **Clean Up Debug Artifacts**

Remove debug files generated during development:

```bash
# Remove debug screenshots and files
rm frontend/debug-*.png

# Update .gitignore to prevent future commits
echo "debug-*.png" >> frontend/.gitignore
```

**Tip**: Add `debug-*.png` to `.gitignore` to prevent accidentally committing debug screenshots.

## Environment Configuration

### Backend (.env.e2e)
```env
# E2E Testing Environment
APP_ENV=testing
DB_DATABASE=meo_mai_moi_test

# Email settings (fallback - database config takes precedence)
MAIL_MAILER=smtp
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM_ADDRESS=test@meomaimoi.local

# Enable email verification
EMAIL_VERIFICATION_REQUIRED=true

# Use sync queue for immediate processing
QUEUE_CONNECTION=sync
```

**Note**: Email configuration is managed via the `EmailConfiguration` model in the database. The E2E seeder automatically configures MailHog as the active email provider.

### Frontend Environment Files

**`.env` (Base configuration)**:
```env
PLAYWRIGHT_BASE_URL=http://localhost:8000
```

**`.env.e2e` (E2E-specific additions)**:
```env
MAILHOG_API_URL=http://localhost:8025/api/v2
```

The Playwright config loads these files in order: `.env.e2e.local` → `.env.e2e` → `.env.local` → `.env`, so e2e-specific settings override base settings.

## MailHog API Usage

### Basic Operations

```typescript
const mailhog = new MailHogClient()

// Get all messages
const messages = await mailhog.getMessages()

// Get messages for specific email
const userMessages = await mailhog.getMessagesForEmail('user@example.com')

// Wait for email with polling
const email = await mailhog.waitForEmail('user@example.com', {
  timeout: 10000,
  subject: 'Welcome'
})

// Extract verification URL
const verificationUrl = mailhog.extractVerificationUrl(email)
```

### Advanced Patterns

```typescript
// Test email content
test('verification email contains correct content', async () => {
  const email = await mailhog.waitForEmail(TEST_USER.email)
  
  expect(email.Content.Headers['Subject'][0]).toContain('Verify')
  expect(email.Content.Body).toContain(TEST_USER.name)
  expect(email.Content.Body).toContain('verify')
})

// Test multiple emails
test('sends welcome email after verification', async () => {
  // Register and verify...
  
  const emails = await mailhog.getMessagesForEmail(TEST_USER.email)
  expect(emails).toHaveLength(2) // Verification + Welcome
  
  const welcomeEmail = emails.find(e => 
    e.Content.Headers['Subject'][0].includes('Welcome')
  )
  expect(welcomeEmail).toBeTruthy()
})
```

## Debugging

### View Emails in Browser
```bash
# Start services and keep running
npm run test:e2e:keep

# Open MailHog UI
open http://localhost:8025
```

### Check Email Configuration
```bash
# Verify email config status
docker compose exec backend php artisan email:verify-config --env=e2e

# Test email connection
docker compose exec backend php artisan email:verify-config --test --env=e2e

# Manually setup MailHog config
docker compose exec backend php artisan db:seed --class=E2EEmailConfigurationSeeder --env=e2e
```

### Check Service Status
```bash
# Check if services are running
docker compose --profile e2e ps

# View logs
docker compose logs mailhog
docker compose logs backend
```

### Debug Test Failures
```bash
# Run with UI mode for debugging (recommended)
npm run test:e2e -- --ui

# Run with visible browser
npm run test:e2e -- --headed

# Run with debug mode (pauses at each step)
npm run test:e2e -- --debug

# Run specific test file with visible browser
npm run test:e2e -- --headed auth.spec.ts

# Enable slow motion for easier observation (uncomment in playwright.config.ts)
# launchOptions: { slowMo: 500 }
```

## Common Issues & Solutions

### 1. **Login Function Not Waiting for Redirects**

**Problem**: Login utility functions don't wait for authentication redirects, causing subsequent navigation to fail

**Solutions**:
- Always wait for URL changes after login: `await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?/)`
- Ensure login functions return only after successful authentication
- Test login functions independently to verify they complete properly

### 2. **Authentication Redirect Loops**

**Problem**: Tests fail because `/register` redirects to `/login`

**Solutions**:
- This was fixed in the AuthContext to exclude public pages from unauthorized redirects
- Ensure `AuthContext.tsx` has proper public path handling
- Check that `loadUser()` is not called on public pages

### 3. **Email Not Received**

**Problem**: Test times out waiting for email

**Solutions**:
- Check MailHog is running: `curl http://localhost:8025/api/v2/messages`
- Verify Laravel mail config points to MailHog
- Check queue is set to `sync` for immediate processing
- Increase timeout in test

### 4. **Verification URL Not Found**

**Problem**: Cannot extract verification URL from email

**Solutions**:
- Check email content format matches expected pattern
- Update regex patterns in `extractVerificationUrl()`
- Log email body for debugging: `console.log(email.Content.Body)`

### 5. **Database State Issues**

**Problem**: Tests fail due to existing data

**Solutions**:
- Use `RefreshDatabase` in Laravel tests
- Run `migrate:fresh --seed` before e2e tests
- Use unique email addresses per test run

### 6. **Service Startup Race Conditions**

**Problem**: Tests start before services are ready

**Solutions**:
- Add health checks to docker-compose.yml
- Use `waitUntil` in Playwright navigation
- Add explicit waits for service availability

### 7. **Global Setup Health Check Issues**

**Problem**: `global-setup.ts` checks for `/api/health` endpoint that may not exist

**Solutions**:
```typescript
// ✅ Good: Check actual web server response
execSync('curl -f -I http://localhost:8000 >/dev/null 2>&1', { stdio: 'pipe' })

// ❌ Bad: Assume /api/health exists
execSync('curl -f http://localhost:8000/api/health >/dev/null 2>&1', { stdio: 'pipe' })
```

**Note**: Use `curl -I` (HEAD request) to check if the web server is responding, rather than assuming specific API endpoints exist.

## Real-World Example: Pet Creation Test

Here's a complete example from our pet creation test that demonstrates multiple best practices:

```typescript
import { test, expect } from '@playwright/test'
import { login } from './utils/app'
import { MailHogClient } from './utils/mailhog'

const TEST_USER = { email: 'user1@catarchy.space', password: 'password' }

test.describe('Pet Creation', () => {
  let mailhog: MailHogClient

  test.beforeEach(async () => {
    mailhog = new MailHogClient()
    await mailhog.clearMessages() // Clean state between tests
  })

  test('allows authenticated user to create a new pet', async ({ page }) => {
    // Login with proper redirect waiting
    await login(page, TEST_USER.email, TEST_USER.password)

    // Navigate to protected route
    await page.goto('/pets/create')
    await expect(page.locator('#root')).toBeVisible()

    // Fill form with complex interactions
    await page.getByLabel('Name').fill('Test Pet')
    await page.getByLabel('Birthday Precision').selectOption('day')
    await page.locator('#birthday').fill('2020-06-15')

    // Handle dynamic city creation
    await page.getByText('Select city').click()
    await page.getByPlaceholder('Search cities...').fill('Test City')
    await page.getByText('Create: "Test City"').click()

    // Submit and verify success
    await page.getByRole('button', { name: 'Create Pet' }).click()
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10000 })
    await expect(page.getByText('Test Pet')).toBeVisible()
  })
})
```

This example shows:
- Proper login with redirect waiting
- Complex form interactions (city selection)
- State cleanup between tests
- Realistic timeouts and expectations
- Complete user flow testing

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Start services
        run: docker compose --profile e2e up -d
        
      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8025/api/v2/messages; do sleep 2; done'
          
      - name: Setup test database
        run: docker compose exec backend php artisan migrate:fresh --seed --env=e2e
        
      - name: Install Playwright
        run: cd frontend && npm ci && npx playwright install
        
      - name: Run E2E tests
        run: cd frontend && npm run e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

## Performance Tips

1. **Parallel Test Execution**: Use `fullyParallel: true` in Playwright config
2. **Selective Service Startup**: Use Docker profiles to only start needed services
3. **Database Optimization**: Use transactions where possible instead of full refreshes
4. **Email Cleanup**: Clear MailHog messages between tests to avoid memory buildup
5. **Timeout Tuning**: Set appropriate timeouts based on your service startup times

## Security Considerations

1. **Test Data Isolation**: Use separate test database and email addresses
2. **Credential Management**: Use environment variables for test credentials
3. **Network Security**: MailHog should only be accessible in test environments
4. **Data Cleanup**: Ensure test data doesn't persist in production-like environments