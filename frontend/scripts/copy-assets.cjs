// scripts/copy-assets.cjs
// Copies the entire frontend build output to the backend public directory.

const fs = require('fs-extra')
const path = require('path')

// Corrected paths by resolving from the script's directory up to the project root.
const srcDir = path.resolve(__dirname, '../dist')
const destDir = path.resolve(__dirname, '../../backend/public/build')
const frontendPublicDir = path.resolve(__dirname, '../public')
const backendPublicDir = path.resolve(__dirname, '../../backend/public')

try {
  fs.emptyDirSync(destDir)
  console.log(`✅ Cleaned destination directory: ${destDir}`)
  fs.copySync(srcDir, destDir)
  console.log(`✅ Successfully copied build from ${srcDir} to ${destDir}`)

  // Keep the legacy offline page at the root so old service workers can load its
  // self-healing migration logic and hand control to the current app-shell worker.
  const rootAssets = [
    'site.webmanifest',
    'site-light.webmanifest',
    'site-dark.webmanifest',
    'offline.html',
    'favicon.svg',
    'favicon.ico',
    'loading.svg',
    'apple-touch-icon.png',
    'icon-16.png',
    'icon-32.png',
    'icon-192.png',
    'icon-512.png',
    'maskable-192.png',
    'maskable-512.png',
  ]
  for (const asset of rootAssets) {
    const from = path.join(frontendPublicDir, asset)
    const to = path.join(backendPublicDir, asset)
    if (fs.existsSync(from)) {
      fs.copySync(from, to)
      console.log(`📄 Copied ${asset} to ${backendPublicDir}`)
    }
  }

  const screenshotDir = path.join(frontendPublicDir, 'screenshots')
  if (fs.existsSync(screenshotDir)) {
    fs.copySync(screenshotDir, path.join(backendPublicDir, 'screenshots'))
    console.log(`🖼  Copied PWA screenshots to ${backendPublicDir}`)
  }

  const wellKnownDir = path.join(frontendPublicDir, '.well-known')
  if (fs.existsSync(wellKnownDir)) {
    fs.copySync(wellKnownDir, path.join(backendPublicDir, '.well-known'))
    console.log(`🔗 Copied Digital Asset Links to ${backendPublicDir}`)
  }

  // Copy generated service worker files to web root for root scope
  const distEntries = fs.readdirSync(srcDir)
  const swFiles = distEntries.filter((f) => /^sw.*\.js$/.test(f) || /^workbox-.*\.js$/.test(f))
  for (const file of swFiles) {
    const from = path.join(srcDir, file)
    const to = path.join(backendPublicDir, file)
    fs.copySync(from, to)
    console.log(`🛠  Copied ${file} to ${backendPublicDir}`)
  }
} catch (error) {
  console.error('❌ Error during file copy:', error)
  process.exit(1)
}
