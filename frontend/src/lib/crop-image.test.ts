import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { getCroppedFile } from './crop-image'

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  set src(_value: string) {
    queueMicrotask(() => this.onload?.())
  }
}

describe('getCroppedFile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('outputs the requested mime type and respects outputMaxSize', async () => {
    vi.stubGlobal('Image', MockImage)
    const drawImage = vi.fn()
    const canvas = document.createElement('canvas')
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      drawImage,
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback, type) => {
      callback(new Blob(['cropped'], { type }))
    })

    const result = await getCroppedFile(
      'blob:source',
      { x: 0, y: 0, width: 2000, height: 1000 },
      {
        fileName: 'avatar.png',
        outputType: 'image/webp',
        outputMaxSize: 1000,
      }
    )

    expect(result).toBeInstanceOf(File)
    expect(result.name).toBe('avatar.webp')
    expect(result.type).toBe('image/webp')
    expect(canvas.width).toBe(1000)
    expect(canvas.height).toBe(500)
    expect(drawImage).toHaveBeenCalled()
  })
})
