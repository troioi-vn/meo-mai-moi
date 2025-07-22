// scripts/postbuild-copy-assets.js
// Copies latest frontend build assets to backend public assets directory

const fs = require('fs')
const path = require('path')

const srcDir = path.resolve(__dirname, '../dist/assets')
const destDir = path.resolve(__dirname, '../../backend/public/assets')

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir)
  process.exit(1)
}
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true })
}

const files = fs.readdirSync(srcDir)
files.forEach((file) => {
  const srcFile = path.join(srcDir, file)
  const destFile = path.join(destDir, file)
  fs.copyFileSync(srcFile, destFile)
  console.log(`Copied ${file}`)
})
