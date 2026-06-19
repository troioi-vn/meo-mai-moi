import { useEffect, type ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('react-easy-crop', () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (
      _area: unknown,
      areaPixels: { x: number; y: number; width: number; height: number }
    ) => void
  }) => {
    useEffect(() => {
      onCropComplete({}, { x: 0, y: 0, width: 100, height: 100 })
      // The real cropper reports this after user interaction; the mock only needs one report.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return <div data-testid="mock-cropper" />
  },
}))

vi.mock('@/lib/crop-image', () => ({
  getCroppedFile: vi.fn(),
}))

import { ImageCropperDialog } from './ImageCropperDialog'
import { getCroppedFile } from '@/lib/crop-image'

const sourceFile = new File(['image'], 'source.jpg', { type: 'image/jpeg' })

describe('ImageCropperDialog', () => {
  it('applies the crop and returns a file', async () => {
    const croppedFile = new File(['cropped'], 'source.jpg', { type: 'image/jpeg' })
    vi.mocked(getCroppedFile).mockResolvedValue(croppedFile)
    const onCropped = vi.fn()

    render(
      <ImageCropperDialog
        open
        onOpenChange={vi.fn()}
        file={sourceFile}
        aspect={1}
        cropShape="round"
        onCropped={onCropped}
      />
    )

    expect(screen.getByTestId('mock-cropper')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply' })).not.toBeDisabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(onCropped).toHaveBeenCalledWith(croppedFile)
    })
  })

  it('cancels without cropping', () => {
    const onCancel = vi.fn()
    const onCropped = vi.fn()

    render(
      <ImageCropperDialog
        open
        onOpenChange={vi.fn()}
        file={sourceFile}
        onCancel={onCancel}
        onCropped={onCropped}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onCropped).not.toHaveBeenCalled()
  })
})
