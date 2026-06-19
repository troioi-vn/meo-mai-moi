import { describe, expect, it } from 'vite-plus/test'
import { MEDIA_LIMITS, validateImageFile, validateImageFiles } from './media-validation'

const makeFile = (name: string, type: string, size: number) =>
  new File(['x'.repeat(size)], name, { type })

describe('media-validation', () => {
  it('accepts supported image files within the size limit', () => {
    const result = validateImageFile(makeFile('photo.webp', 'image/webp', 1024), {
      maxBytes: MEDIA_LIMITS.petPhoto.maxBytes,
    })

    expect(result).toEqual({ ok: true })
  })

  it('rejects non-image files', () => {
    const result = validateImageFile(makeFile('notes.txt', 'text/plain', 1024), {
      maxBytes: MEDIA_LIMITS.petPhoto.maxBytes,
    })

    expect(result).toEqual({ ok: false, errorKey: 'media:validation.notImage' })
  })

  it('rejects oversized files with a megabyte limit param', () => {
    const result = validateImageFile(makeFile('large.jpg', 'image/jpeg', 3 * 1024 * 1024), {
      maxBytes: MEDIA_LIMITS.avatar.maxBytes,
    })

    expect(result).toEqual({
      ok: false,
      errorKey: 'media:validation.tooLarge',
      params: { size: 2 },
    })
  })

  it('rejects too many files', () => {
    const files = Array.from({ length: 6 }, (_, index) =>
      makeFile(`helper-${String(index)}.jpg`, 'image/jpeg', 1024)
    )

    const result = validateImageFiles(files, MEDIA_LIMITS.helperPhoto)

    expect(result).toEqual({
      ok: false,
      errorKey: 'media:validation.tooMany',
      params: { count: 5 },
    })
  })
})
