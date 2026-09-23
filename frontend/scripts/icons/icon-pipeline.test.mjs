import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import {
  androidOutputs,
  generateBrandAssets,
  generateWebIcons,
  WEB_OUTPUTS,
} from './icon-pipeline.mjs'

const fixture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f97316"/><circle cx="50" cy="50" r="25" fill="#fff"/></svg>`

test('generates every documented web raster at its declared size', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'meo-icons-'))
  const outputDirectory = path.join(temporaryDirectory, 'output')

  try {
    await Promise.all([
      writeFile(path.join(temporaryDirectory, 'app.svg'), fixture),
      writeFile(path.join(temporaryDirectory, 'maskable.svg'), fixture),
      writeFile(path.join(temporaryDirectory, 'favicon.svg'), fixture),
    ])
    await generateWebIcons({ sourceDirectory: temporaryDirectory, outputDirectory })

    for (const item of WEB_OUTPUTS) {
      const output = path.join(outputDirectory, item.output)
      const metadata = await sharp(await readFile(output)).metadata()
      assert.equal(metadata.width, item.size)
      assert.equal(metadata.height, item.size)
      assert.equal(metadata.format, 'png')
    }

    const splash = sharp(path.join(outputDirectory, 'icon-512.png'))
    const corner = await splash.extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer()
    const center = await sharp(path.join(outputDirectory, 'icon-512.png'))
      .extract({ left: 256, top: 256, width: 1, height: 1 })
      .raw()
      .toBuffer()
    assert.deepEqual([...corner.subarray(0, 3)], [23, 23, 23])
    assert.deepEqual([...center.subarray(0, 3)], [255, 255, 255])
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})

test('generates favicon, loading, store, and every Android density asset', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'meo-branding-'))
  const webDirectory = path.join(temporaryDirectory, 'web')
  const androidDirectory = path.join(temporaryDirectory, 'android')

  try {
    await Promise.all(
      ['app.svg', 'maskable.svg', 'loading.svg', 'notification.svg', 'favicon.svg'].map((file) =>
        writeFile(path.join(temporaryDirectory, file), fixture)
      )
    )
    await generateBrandAssets({
      sourceDirectory: temporaryDirectory,
      webDirectory,
      androidDirectory,
    })

    assert.equal((await readFile(path.join(webDirectory, 'favicon.ico'))).readUInt16LE(2), 1)
    assert.equal(await readFile(path.join(webDirectory, 'favicon.svg'), 'utf8'), fixture)
    assert.equal(await readFile(path.join(webDirectory, 'loading.svg'), 'utf8'), fixture)
    assert.equal((await sharp(path.join(androidDirectory, 'store_icon.png')).metadata()).width, 512)

    for (const item of androidOutputs(androidDirectory)) {
      const metadata = await sharp(item.output).metadata()
      assert.equal(metadata.width, item.size)
      assert.equal(metadata.height, item.size)
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
