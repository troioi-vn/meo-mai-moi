import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Load env from local files (explicit env vars still take precedence)
// In ESM, __dirname is not defined. Derive a root directory safely.
const __filename = fileURLToPath(import.meta.url)
const __dirnameShim = path.dirname(__filename)
// Prefer project root (frontend/) as base for env files
const baseDir = process.cwd() || __dirnameShim
const envFiles = ['.env.e2e.local', '.env.e2e', '.env.local', '.env'].map((f) =>
  path.resolve(baseDir, f)
)

for (const f of envFiles) {
  if (fs.existsSync(f)) {
    dotenv.config({ path: f, override: false })
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000'
const isLocalhost = /localhost|127\.0\.0\.1/.test(baseURL)

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    // Uncomment the line below to slow down tests for debugging
    launchOptions: { slowMo: 500 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Don't auto-start dev server for e2e tests - we use Docker containers
  webServer: undefined,
})
