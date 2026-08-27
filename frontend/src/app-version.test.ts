import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vite-plus/test'

const testDir = path.dirname(fileURLToPath(import.meta.url))

function backendAppVersion(): string {
  const source = fs.readFileSync(path.resolve(testDir, '../../backend/config/version.php'), 'utf8')
  const version = /'api'\s*=>\s*env\('API_VERSION',\s*'([^']+)'\)/.exec(source)?.[1]

  expect(version, 'could not read the app version from backend/config/version.php').toBeTruthy()

  return String(version)
}

describe('app version wiring', () => {
  it('builds the frontend against the backend app version', () => {
    // vite.config.ts resolves VITE_APP_VERSION from backend/config/version.php, the
    // same value /api/version and X-App-Version report. It used to fall through to
    // npm_package_version, which shipped frontend/package.json's version instead, so
    // the error sink recorded 0.6.0 and the theme-provider manifest swap pinned a URL
    // that never changed between releases.
    expect(import.meta.env.VITE_APP_VERSION).toBe(backendAppVersion())
  })

  it('does not fall back to the frontend package version', () => {
    const packageVersion = (
      JSON.parse(fs.readFileSync(path.resolve(testDir, '../package.json'), 'utf8')) as {
        version: string
      }
    ).version

    expect(import.meta.env.VITE_APP_VERSION).not.toBe(packageVersion)
    expect(import.meta.env.VITE_APP_VERSION).not.toBe('dev')
  })
})
