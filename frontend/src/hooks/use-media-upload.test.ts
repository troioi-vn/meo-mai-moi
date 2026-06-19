import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { toast } from 'sonner'
import { useMediaUpload } from './use-media-upload'
import { uploadMedia } from '@/lib/media-upload-service'

vi.mock('@/lib/media-upload-service', () => ({
  uploadMedia: vi.fn(),
}))

const makeFile = (name: string, type = 'image/jpeg') => new File(['photo'], name, { type })

describe('useMediaUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  it('shows a toast when validation fails', () => {
    const { result } = renderHook(() => useMediaUpload({ limitKey: 'petPhoto' }))

    act(() => {
      result.current.selectFiles([makeFile('notes.txt', 'text/plain')])
    })

    expect(toast.error).toHaveBeenCalledWith('Please choose an image file')
  })

  it('creates previews and revokes them on reset', () => {
    const onSelectDeferred = vi.fn()
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const { result } = renderHook(() =>
      useMediaUpload({ limitKey: 'petPhoto', mode: 'deferred', onSelectDeferred })
    )

    const file = makeFile('photo.jpg')
    act(() => {
      result.current.selectFiles([file])
    })

    expect(result.current.previews).toEqual([{ id: expect.any(String), url: 'blob:preview' }])
    expect(onSelectDeferred).toHaveBeenCalledWith([file])

    act(() => {
      result.current.reset()
    })

    expect(revokeSpy).toHaveBeenCalledWith('blob:preview')
  })

  it('uploads immediately and calls onUploaded with the payload', async () => {
    const payload = { id: 1 }
    vi.mocked(uploadMedia).mockResolvedValue(payload)
    const onUploaded = vi.fn()
    const { result } = renderHook(() =>
      useMediaUpload({
        target: { kind: 'avatar' },
        limitKey: 'avatar',
        onUploaded,
      })
    )

    act(() => {
      result.current.selectFiles([makeFile('avatar.jpg')])
    })

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(payload)
    })
    expect(uploadMedia).toHaveBeenCalledWith(
      { kind: 'avatar' },
      expect.any(File),
      expect.any(Function)
    )
  })

  it('updates upload progress and resets it after success', async () => {
    vi.mocked(uploadMedia).mockImplementation(async (_target, _file, onProgress) => {
      onProgress?.(25)
      onProgress?.(100)
      return { id: 1 }
    })
    const { result } = renderHook(() =>
      useMediaUpload({
        target: { kind: 'avatar' },
        limitKey: 'avatar',
      })
    )

    act(() => {
      result.current.selectFiles([makeFile('avatar.jpg')])
    })

    await waitFor(() => {
      expect(result.current.progress).toBeNull()
    })
    expect(uploadMedia).toHaveBeenCalledWith(
      { kind: 'avatar' },
      expect.any(File),
      expect.any(Function)
    )
  })

  it('opens the crop dialog before processing a raster image when crop is configured', () => {
    const onSelectDeferred = vi.fn()
    const { result } = renderHook(() =>
      useMediaUpload({
        limitKey: 'petPhoto',
        mode: 'deferred',
        cropConfig: { aspect: 1 },
        onSelectDeferred,
      })
    )

    act(() => {
      result.current.selectFiles([makeFile('photo.jpg')])
    })

    expect(result.current.cropDialog).not.toBeNull()
    expect(result.current.previews).toEqual([])
    expect(onSelectDeferred).not.toHaveBeenCalled()
  })

  it('bypasses cropping for SVG files', () => {
    const onSelectDeferred = vi.fn()
    const { result } = renderHook(() =>
      useMediaUpload({
        limitKey: 'petPhoto',
        mode: 'deferred',
        cropConfig: { aspect: 1 },
        onSelectDeferred,
      })
    )
    const file = makeFile('vector.svg', 'image/svg+xml')

    act(() => {
      result.current.selectFiles([file])
    })

    expect(result.current.cropDialog).toBeNull()
    expect(onSelectDeferred).toHaveBeenCalledWith([file])
  })
})
