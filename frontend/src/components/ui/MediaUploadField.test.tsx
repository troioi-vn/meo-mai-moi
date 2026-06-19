import { fireEvent, render, screen } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'
import { MediaUploadField } from './MediaUploadField'

const imageFile = new File(['image'], 'photo.jpg', { type: 'image/jpeg' })

const dataTransfer = (files: File[]) => ({
  files,
  types: ['Files'],
  dropEffect: 'none',
})

describe('MediaUploadField', () => {
  it('opens the file picker when the button variant is clicked', () => {
    const { container } = render(<MediaUploadField limitKey="petPhoto" mode="deferred" />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => undefined)

    fireEvent.click(screen.getByRole('button', { name: 'Choose photo' }))

    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows the current image for image variants', () => {
    render(
      <MediaUploadField
        limitKey="avatar"
        mode="deferred"
        variant="avatar-circle"
        currentImage={{ src: '/storage/avatar.jpg', alt: 'Athanasius avatar' }}
      />
    )

    expect(screen.getByRole('img', { name: 'Athanasius avatar' })).toHaveAttribute(
      'src',
      '/storage/avatar.jpg'
    )
  })

  it('fires remove when the remove button is clicked', () => {
    const onRemove = vi.fn()
    render(
      <MediaUploadField
        limitKey="avatar"
        mode="deferred"
        variant="avatar-circle"
        currentImage={{ src: '/storage/avatar.jpg', alt: 'Athanasius avatar' }}
        showRemove
        onRemove={onRemove}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

    expect(onRemove).toHaveBeenCalled()
  })

  it('highlights the dropzone and sends dropped files through selection', () => {
    const onSelectDeferred = vi.fn()
    render(
      <MediaUploadField
        limitKey="helperPhoto"
        mode="deferred"
        variant="dropzone"
        multiple
        onSelectDeferred={onSelectDeferred}
      />
    )

    const dropzone = screen.getByRole('button', { name: /drag & drop/i })
    fireEvent.dragEnter(dropzone, { dataTransfer: dataTransfer([imageFile]) })

    expect(dropzone).toHaveClass('border-primary')

    fireEvent.drop(dropzone, { dataTransfer: dataTransfer([imageFile]) })

    expect(onSelectDeferred).toHaveBeenCalledWith([imageFile])
  })
})
