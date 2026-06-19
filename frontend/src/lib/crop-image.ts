export interface CropAreaPixels {
  x: number
  y: number
  width: number
  height: number
}

interface CropImageOptions {
  fileName?: string
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
  outputMaxSize?: number
  rotation?: number
}

const extensionForType = (type: string) => {
  switch (type) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

const outputFileName = (fileName: string | undefined, type: string) => {
  const baseName = fileName?.replace(/\.[^.]+$/, '') ?? 'cropped-image'
  return `${baseName}.${extensionForType(type)}`
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }
    image.onerror = () => {
      reject(new Error('Failed to load image for cropping'))
    }
    image.src = src
  })

const toBlob = (canvas: HTMLCanvasElement, type: string, quality = 0.92) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error('Failed to crop image'))
      },
      type,
      quality
    )
  })

const fitWithinMaxSize = (width: number, height: number, maxSize?: number) => {
  if (!maxSize || Math.max(width, height) <= maxSize) {
    return { width, height }
  }

  const scale = maxSize / Math.max(width, height)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export async function getCroppedFile(
  src: string,
  areaPixels: CropAreaPixels,
  { fileName, outputType = 'image/jpeg', outputMaxSize, rotation = 0 }: CropImageOptions = {}
) {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not available')
  }

  const outputSize = fitWithinMaxSize(areaPixels.width, areaPixels.height, outputMaxSize)
  canvas.width = outputSize.width
  canvas.height = outputSize.height

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(
    image,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    -canvas.width / 2,
    -canvas.height / 2,
    canvas.width,
    canvas.height
  )
  ctx.restore()

  const blob = await toBlob(canvas, outputType)
  return new File([blob], outputFileName(fileName, outputType), { type: outputType })
}
