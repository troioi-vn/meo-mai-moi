import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { androidOutputs, WEB_OUTPUTS } from './icon-pipeline.mjs'

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

for (const filename of ['favicon.svg', 'favicon.ico', 'loading.svg']) {
  assert.deepEqual(
    await readFile(path.join(frontendDirectory, 'public', filename)),
    await readFile(path.join(repositoryDirectory, 'backend/public', filename)),
    `${filename} is not mirrored to backend/public`
  )
}

for (const item of androidOutputs(path.join(repositoryDirectory, 'android'))) {
  const metadata = await sharp(item.output).metadata()
  assert.equal(metadata.width, item.size, `${item.output} has the wrong width`)
  assert.equal(metadata.height, item.size, `${item.output} has the wrong height`)
}

const storeMetadata = await sharp(
  path.join(repositoryDirectory, 'android/store_icon.png')
).metadata()
assert.equal(storeMetadata.width, 512, 'Android store icon has the wrong width')
assert.equal(storeMetadata.height, 512, 'Android store icon has the wrong height')

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

console.log('Web, favicon, backend mirror, manifest, and Android branding assets are valid.')
