import { fireEvent, render, screen } from '@/testing'
import { describe, expect, it, vi } from 'vite-plus/test'
import { MediaUploadField } from './MediaUploadField'

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
})
