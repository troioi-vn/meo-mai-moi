export interface PosterPrintState {
  sheet: HTMLElement | null
  ready: boolean
  revision: string
}

async function decodeImage(image: HTMLImageElement): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await image.decode()
      return image.naturalWidth > 0
    } catch {
      // decode() can reject when rendering changes even though the image has
      // loaded. Only an actual img error event marks a photo as failed.
      if (image.complete && image.naturalWidth > 0) return true
    }
  }
  return false
}

/** Revalidate after every asynchronous boundary; never print a detached sheet. */
export async function printPoster(readState: () => PosterPrintState | null): Promise<boolean> {
  const initial = readState()
  const sheet = initial?.sheet
  if (!initial?.ready || !sheet?.isConnected) return false
  const revision = initial.revision
  const unchanged = () => {
    const current = readState()
    return (
      current?.ready === true &&
      current.sheet === sheet &&
      current.revision === revision &&
      sheet.isConnected
    )
  }
  if ('fonts' in document) await document.fonts.ready
  if (!unchanged()) return false
  const images = Array.from(sheet.querySelectorAll('img'))
  if (!(await Promise.all(images.map(decodeImage))).every(Boolean) || !unchanged()) return false
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
  if (!unchanged() || images.some((image) => !image.isConnected || image.naturalWidth === 0))
    return false
  window.print()
  return true
}
