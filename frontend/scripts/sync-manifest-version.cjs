// scripts/sync-manifest-version.cjs
// Stamps the web manifest icon URLs with the current app version.
//
// App icons keep stable filenames across releases, so a browser that already
// holds /icon-192.png keeps painting the old artwork after the icons change.
// Adding ?v=<version> makes each release ask for fresh bytes, the same way the
// Blade layout already versions the manifest link itself with config('version.api').
//
// backend/config/version.php is the single source of truth. Run this after
// bumping it (see docs/release.md); a matching assertion in src/pwa.test.ts
// fails the suite if the two drift apart.

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '../..')
const versionFile = path.join(repoRoot, 'backend/config/version.php')

const MANIFESTS = ['site.webmanifest', 'site-light.webmanifest', 'site-dark.webmanifest']
const MANIFEST_DIRS = [
  path.join(repoRoot, 'frontend/public'),
  path.join(repoRoot, 'backend/public'),
]

// Only launcher icons are stamped. Screenshots also live under "src" but they are
// not cached as app identity, so leaving them alone keeps the diff small.
const ICON_SRC = /("src":\s*")\/((?:icon|maskable)-\d+\.png)(?:\?[^"]*)?(")/g

function readAppVersion() {
  const source = fs.readFileSync(versionFile, 'utf8')
  const match = /'api'\s*=>\s*env\('API_VERSION',\s*'([^']+)'\)/.exec(source)
  if (!match) {
    throw new Error(`Could not read the app version from ${versionFile}`)
  }
  return match[1]
}

function stampManifest(file, version) {
  const original = fs.readFileSync(file, 'utf8')
  const stamped = original.replaceAll(ICON_SRC, `$1/$2?v=${version}$3`)
  if (stamped === original) {
    return false
  }
  fs.writeFileSync(file, stamped)
  return true
}

function main() {
  const version = readAppVersion()
  let changed = 0

  for (const dir of MANIFEST_DIRS) {
    for (const name of MANIFESTS) {
      const file = path.join(dir, name)
      if (!fs.existsSync(file)) {
        throw new Error(`Missing manifest: ${file}`)
      }
      if (stampManifest(file, version)) {
        changed += 1
        console.log(`🔖 ${path.relative(repoRoot, file)} → ?v=${version}`)
      }
    }
  }

  console.log(
    changed === 0
      ? `✅ Manifest icons already stamped with ${version}`
      : `✅ Stamped ${String(changed)} manifest(s) with ${version}`
  )
}

main()
