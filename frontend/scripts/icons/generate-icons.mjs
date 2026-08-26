import { access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateWebIcons } from './icon-pipeline.mjs'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sourceDirectory = path.join(frontendDirectory, 'branding')
const requiredSources = ['app.svg', 'maskable.svg', 'loading.svg', 'notification.svg']

const missing = []
for (const filename of requiredSources) {
  try {
    await access(path.join(sourceDirectory, filename))
  } catch {
    missing.push(filename)
  }
}

if (missing.length > 0) {
  console.error(`Missing branding sources in frontend/branding: ${missing.join(', ')}`)
  console.error('Read docs/logo-update.md before adding the SVG artwork.')
  process.exit(1)
}

await generateWebIcons({ sourceDirectory, outputDirectory: path.join(frontendDirectory, 'public') })
console.log('Generated web icon PNGs from frontend/branding.')
