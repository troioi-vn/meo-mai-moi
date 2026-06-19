import { fireEvent, render, screen } from '@/testing'
import { describe, expect, it } from 'vite-plus/test'
import { MediaImage } from './MediaImage'

describe('MediaImage', () => {
  it('shows a skeleton until the image loads', () => {
    const { container } = render(<MediaImage src="/storage/photo.jpg" alt="Fluffy" />)

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()

    fireEvent.load(screen.getByRole('img', { name: 'Fluffy' }))

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument()
  })

  it('keeps lazy images renderable while the skeleton is visible', () => {
    render(<MediaImage src="/storage/photo.jpg" alt="Fluffy" loading="lazy" />)

    const image = screen.getByRole('img', { name: 'Fluffy' })

    expect(image).not.toHaveClass('hidden')
    expect(image).toHaveClass('opacity-0')
  })

  it('passes alt and loading through to the image', () => {
    render(<MediaImage src="/storage/photo.jpg" alt="Fluffy portrait" loading="eager" />)

    const image = screen.getByRole('img', { name: 'Fluffy portrait' })

    expect(image).toHaveAttribute('alt', 'Fluffy portrait')
    expect(image).toHaveAttribute('loading', 'eager')
  })

  it('falls back from a failed thumbnail to the full image', () => {
    render(
      <MediaImage
        src="/storage/photo-medium.jpg"
        thumbSrc="/storage/photo-thumb.jpg"
        alt="Photo of Fluffy"
      />
    )

    const image = screen.getByRole('img', { name: 'Photo of Fluffy' })
    expect(image).toHaveAttribute('src', '/storage/photo-thumb.jpg')

    fireEvent.error(image)

    expect(image).toHaveAttribute('src', '/storage/photo-medium.jpg')
  })

  it('renders a clean fallback when the full image fails', () => {
    render(<MediaImage src="/storage/missing.jpg" alt="Missing pet photo" />)

    fireEvent.error(screen.getByRole('img', { name: 'Missing pet photo' }))

    expect(screen.getByRole('img', { name: 'Image failed to load' })).toBeInTheDocument()
  })

  it('renders a custom fallback when provided', () => {
    render(
      <MediaImage
        src="/storage/missing.jpg"
        alt="Missing pet photo"
        fallback={<div role="img" aria-label="Custom fallback" />}
      />
    )

    fireEvent.error(screen.getByRole('img', { name: 'Missing pet photo' }))

    expect(screen.getByRole('img', { name: 'Custom fallback' })).toBeInTheDocument()
  })
})
