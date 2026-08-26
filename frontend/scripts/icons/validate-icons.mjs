import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { WEB_OUTPUTS } from './icon-pipeline.mjs'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const repositoryDirectory = path.resolve(frontendDirectory, '..')

for (const item of WEB_OUTPUTS) {
  const frontendFile = path.join(frontendDirectory, 'public', item.output)
  const backendFile = path.join(repositoryDirectory, 'backend/public', item.output)
  const metadata = await sharp(frontendFile).metadata()
  assert.equal(metadata.width, item.size, `${item.output} has the wrong width`)
  assert.equal(metadata.height, item.size, `${item.output} has the wrong height`)
  assert.deepEqual(
    await readFile(frontendFile),
    await readFile(backendFile),
    `${item.output} is not mirrored to backend/public`
  )
}

for (const manifestName of [
  'site.webmanifest',
  'site-light.webmanifest',
  'site-dark.webmanifest',
]) {
  const manifest = JSON.parse(
    await readFile(path.join(frontendDirectory, 'public', manifestName), 'utf8')
  )
  const iconSources = new Set(manifest.icons.map((icon) => icon.src))
  for (const required of [
    '/icon-192.png',
    '/icon-512.png',
    '/maskable-192.png',
    '/maskable-512.png',
  ]) {
    assert(iconSources.has(required), `${manifestName} does not reference ${required}`)
  }
}

console.log('Icon dimensions, backend mirrors, and manifest references are valid.')
