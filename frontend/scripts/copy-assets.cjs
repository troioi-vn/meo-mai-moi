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

  // Copy PWA root assets (manifest, offline page, icons) to Laravel public root
  const rootAssets = [
    'site.webmanifest',
    'site-light.webmanifest',
    'site-dark.webmanifest',
    'offline.html',
    'apple-touch-icon.png',
    'icon-16.png',
    'icon-32.png',
    'icon-192.png',
    'icon-512.png',
  ]
  for (const asset of rootAssets) {
    const from = path.join(frontendPublicDir, asset)
    const to = path.join(backendPublicDir, asset)
    if (fs.existsSync(from)) {
      fs.copySync(from, to)
      console.log(`📄 Copied ${asset} to ${backendPublicDir}`)
    }
  }

  // Ensure maskable icons exist at root; if missing, duplicate base icons
  const maskablePairs = [
    { base: 'icon-192.png', maskable: 'maskable-192.png' },
    { base: 'icon-512.png', maskable: 'maskable-512.png' },
  ]
  for (const { base, maskable } of maskablePairs) {
    const maskableSrc = path.join(frontendPublicDir, maskable)
    const maskableDest = path.join(backendPublicDir, maskable)
    if (!fs.existsSync(maskableSrc) && !fs.existsSync(maskableDest)) {
      const baseSrc = path.join(frontendPublicDir, base)
      if (fs.existsSync(baseSrc)) {
        fs.copySync(baseSrc, maskableDest)
        console.log(`🖼  Created ${maskable} from ${base} at ${backendPublicDir}`)
      }
    }
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
