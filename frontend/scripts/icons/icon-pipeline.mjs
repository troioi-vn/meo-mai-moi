import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const WEB_OUTPUTS = [
  { source: 'app.svg', output: 'icon-16.png', size: 16 },
  { source: 'app.svg', output: 'icon-32.png', size: 32 },
  { source: 'app.svg', output: 'icon-192.png', size: 192 },
  { source: 'app.svg', output: 'icon-512.png', size: 512 },
  { source: 'maskable.svg', output: 'apple-touch-icon.png', size: 180 },
  { source: 'maskable.svg', output: 'maskable-192.png', size: 192 },
  { source: 'maskable.svg', output: 'maskable-512.png', size: 512 },
]

const ANDROID_DENSITIES = [
  { density: 'mdpi', launcher: 48, maskable: 82, splash: 300, notification: 24 },
  { density: 'hdpi', launcher: 72, maskable: 123, splash: 450, notification: 36 },
  { density: 'xhdpi', launcher: 96, maskable: 164, splash: 600, notification: 48 },
  { density: 'xxhdpi', launcher: 144, maskable: 246, splash: 900, notification: 72 },
  { density: 'xxxhdpi', launcher: 192, maskable: 328, splash: 1200, notification: 96 },
]

export function androidOutputs(androidDirectory) {
  const resourceDirectory = path.join(androidDirectory, 'app/src/main/res')
  return ANDROID_DENSITIES.flatMap(({ density, launcher, maskable, splash, notification }) => [
    {
      source: 'app.svg',
      output: path.join(resourceDirectory, `mipmap-${density}/ic_launcher.png`),
      size: launcher,
    },
    {
      source: 'maskable.svg',
      output: path.join(resourceDirectory, `mipmap-${density}/ic_maskable.png`),
      size: maskable,
    },
    {
      source: 'loading.svg',
      output: path.join(resourceDirectory, `drawable-${density}/splash.png`),
      size: splash,
    },
    {
      source: 'notification.svg',
      output: path.join(resourceDirectory, `drawable-${density}/ic_notification_icon.png`),
      size: notification,
      monochrome: true,
    },
  ])
}

export async function renderIcon({ sourcePath, outputPath, size, flatten, monochrome }) {
  await mkdir(path.dirname(outputPath), { recursive: true })
  if (monochrome) {
    const alpha = await sharp(sourcePath, { density: 384 })
      .resize(size, size, { fit: 'contain' })
      .ensureAlpha()
      .extractChannel('alpha')
      .threshold(96)
      .toBuffer()
    await sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } })
      .joinChannel(alpha)
      .png()
      .toFile(outputPath)
    return
  }

  let image = sharp(sourcePath, { density: 384 }).resize(size, size, { fit: 'contain' })
  if (flatten) image = image.flatten({ background: flatten })
  await image.png().toFile(outputPath)
}

function pngIco(png, size) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header.writeUInt8(size === 256 ? 0 : size, 6)
  header.writeUInt8(size === 256 ? 0 : size, 7)
  header.writeUInt8(0, 8)
  header.writeUInt8(0, 9)
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(png.length, 14)
  header.writeUInt32LE(header.length, 18)
  return Buffer.concat([header, png])
}

export async function generateBrandAssets({ sourceDirectory, webDirectory, androidDirectory }) {
  await generateWebIcons({ sourceDirectory, outputDirectory: webDirectory })

  await copyFile(path.join(sourceDirectory, 'favicon.svg'), path.join(webDirectory, 'favicon.svg'))
  await copyFile(path.join(sourceDirectory, 'loading.svg'), path.join(webDirectory, 'loading.svg'))
  const faviconPng = await sharp(path.join(sourceDirectory, 'favicon.svg'), { density: 384 })
    .resize(32, 32)
    .png()
    .toBuffer()
  await writeFile(path.join(webDirectory, 'favicon.ico'), pngIco(faviconPng, 32))

  if (androidDirectory) {
    for (const item of androidOutputs(androidDirectory)) {
      await renderIcon({
        sourcePath: path.join(sourceDirectory, item.source),
        outputPath: item.output,
        size: item.size,
        monochrome: item.monochrome,
      })
    }
    await renderIcon({
      sourcePath: path.join(sourceDirectory, 'maskable.svg'),
      outputPath: path.join(androidDirectory, 'store_icon.png'),
      size: 512,
    })
  }
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
