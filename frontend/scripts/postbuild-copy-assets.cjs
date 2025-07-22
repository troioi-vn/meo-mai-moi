// scripts/postbuild-copy-assets.cjs
// 1. Updates the Blade template with the new, hashed asset filenames.
// 2. Copies the entire frontend build output to the backend public directory.

const fs = require('fs-extra')
const path = require('path')

const srcDir = path.resolve(__dirname, '../dist')
const destDir = path.resolve(__dirname, '../../backend/public/build')
const bladeTemplatePath = path.resolve(__dirname, '../../backend/resources/views/welcome.blade.php')
const manifestPath = path.resolve(srcDir, '.vite/manifest.json')

// Step 1: Update Blade template with new asset paths
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  // Find the entry chunk dynamically instead of hardcoding the key
  const entryChunk = Object.values(manifest).find((chunk) => chunk.isEntry === true)

  if (!entryChunk) {
    throw new Error(
      'Could not find the entry chunk in manifest.json. Looked for a chunk with isEntry: true.'
    )
  }

  const jsFile = entryChunk.file
  // An entry chunk might not have a corresponding CSS file.
  const cssFile = entryChunk.css ? entryChunk.css[0] : null

  if (!jsFile) {
    throw new Error('Manifest entry is missing JS file path.')
  }

  let templateContent = fs.readFileSync(bladeTemplatePath, 'utf-8')

  // Replace JS script tag
  templateContent = templateContent.replace(
    /<script type="module" src="{{ asset\('build\/assets\/[^']+\.js'\) }}">/,
    `<script type="module" src="{{ asset('build/${jsFile}') }}">`
  )

  // Replace CSS link tag only if a CSS file exists for the entry
  if (cssFile) {
    templateContent = templateContent.replace(
      /<link rel="stylesheet" href="{{ asset\('build\/assets\/[^']+\.css'\) }}">/,
      `<link rel="stylesheet" href="{{ asset('build/${cssFile}') }}">`
    )
  } else {
    // If no CSS file, remove the old link to avoid 404s
    templateContent = templateContent.replace(
      /<link rel="stylesheet" href="{{ asset\('build\/assets\/[^']+\.css'\) }}">/,
      ''
    )
  }

  fs.writeFileSync(bladeTemplatePath, templateContent)
  console.log(`Successfully updated Blade template: ${bladeTemplatePath}`)
} catch (error) {
  console.error('Error updating Blade template:', error)
  process.exit(1)
}

// Step 2: Clean and copy build files
try {
  fs.emptyDirSync(destDir)
  console.log(`Cleaned destination directory: ${destDir}`)
  fs.copySync(srcDir, destDir)
  console.log(`Successfully copied build from ${srcDir} to ${destDir}`)
} catch (error) {
  console.error('Error during file copy:', error)
  process.exit(1)
}
