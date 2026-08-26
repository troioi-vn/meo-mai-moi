import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { generateWebIcons, WEB_OUTPUTS } from './icon-pipeline.mjs'

const fixture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f97316"/><circle cx="50" cy="50" r="25" fill="#fff"/></svg>`

test('generates every documented web raster at its declared size', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'meo-icons-'))
  const outputDirectory = path.join(temporaryDirectory, 'output')

  try {
    await Promise.all([
      writeFile(path.join(temporaryDirectory, 'app.svg'), fixture),
      writeFile(path.join(temporaryDirectory, 'maskable.svg'), fixture),
    ])
    await generateWebIcons({ sourceDirectory: temporaryDirectory, outputDirectory })

    for (const item of WEB_OUTPUTS) {
      const output = path.join(outputDirectory, item.output)
      const metadata = await sharp(await readFile(output)).metadata()
      assert.equal(metadata.width, item.size)
      assert.equal(metadata.height, item.size)
      assert.equal(metadata.format, 'png')
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
})
