// scripts/copy-assets.cjs
// Copies the entire frontend build output to the backend public directory.

const fs = require('fs-extra')
const path = require('path')

// Corrected paths by resolving from the script's directory up to the project root.
const srcDir = path.resolve(__dirname, '../dist')
const destDir = path.resolve(__dirname, '../../backend/public/build')

try {
  fs.emptyDirSync(destDir)
  console.log(`✅ Cleaned destination directory: ${destDir}`)
  fs.copySync(srcDir, destDir)
  console.log(`✅ Successfully copied build from ${srcDir} to ${destDir}`)
} catch (error) {
  console.error('❌ Error during file copy:', error)
  process.exit(1)
}
