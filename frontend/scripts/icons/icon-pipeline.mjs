import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const WEB_OUTPUTS = [
  { source: 'app.svg', output: 'icon-16.png', size: 16 },
  { source: 'app.svg', output: 'icon-32.png', size: 32 },
  { source: 'app.svg', output: 'icon-192.png', size: 192 },
  { source: 'app.svg', output: 'icon-512.png', size: 512 },
  { source: 'app.svg', output: 'apple-touch-icon.png', size: 180, flatten: '#ffffff' },
  { source: 'maskable.svg', output: 'maskable-192.png', size: 192 },
  { source: 'maskable.svg', output: 'maskable-512.png', size: 512 },
]

export async function renderIcon({ sourcePath, outputPath, size, flatten }) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  let image = sharp(sourcePath, { density: 384 }).resize(size, size, { fit: 'contain' })
  if (flatten) image = image.flatten({ background: flatten })
  await image.png().toFile(outputPath)
}

export async function generateWebIcons({ sourceDirectory, outputDirectory }) {
  for (const item of WEB_OUTPUTS) {
    await renderIcon({
      sourcePath: path.join(sourceDirectory, item.source),
      outputPath: path.join(outputDirectory, item.output),
      size: item.size,
      flatten: item.flatten,
    })
  }
}
