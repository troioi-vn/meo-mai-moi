import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Load env from local files (explicit env vars still take precedence)
// In ESM, __dirname is not defined. Derive a root directory safely.
const __filename = fileURLToPath(import.meta.url)
const __dirnameShim = path.dirname(__filename)
// Prefer frontend/ (where this config lives) for env files.
// If the repo runs Playwright from the workspace root, fall back to CWD only when no frontend env files exist.
const configDir = __dirnameShim
const cwdDir = process.cwd()
const envFileNames = ['.env.e2e.local', '.env.e2e', '.env.local', '.env']
const hasFrontendEnvFile = envFileNames.some((f) => fs.existsSync(path.resolve(configDir, f)))
const baseDir = hasFrontendEnvFile ? configDir : cwdDir
const envFiles = envFileNames.map((f) => path.resolve(baseDir, f))

for (const f of envFiles) {
  if (fs.existsSync(f)) {
    dotenv.config({ path: f, override: false })
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000'
const slowMo = Number(process.env.PLAYWRIGHT_SLOWMO || 0)

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    // Slow down tests for debugging (e.g. PLAYWRIGHT_SLOWMO=250)
    launchOptions: slowMo > 0 ? { slowMo } : undefined,
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
