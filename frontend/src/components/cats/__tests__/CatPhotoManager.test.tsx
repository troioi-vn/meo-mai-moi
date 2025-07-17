import { vi } from 'vitest'
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import CatPhotoManager from '../CatPhotoManager'
import type { Cat } from '@/types/cat'
import { mockCat } from '@/mocks/data/cats'
import { toast } from 'sonner'



describe('CatPhotoManager', () => {
  const mockOnPhotoUpdated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders photo for non-owner (no controls)', () => {
    renderWithRouter(
      <CatPhotoManager
        cat={mockCat}
        isOwner={false}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )

    expect(screen.getByText('Cat Photo')).toBeInTheDocument()
    const image = screen.getByAltText('Photo of Fluffy')
    expect(image).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /replace/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('renders photo and controls for owner', () => {
    renderWithRouter(
      <CatPhotoManager
        cat={mockCat}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )

    const image = screen.getByAltText('Photo of Fluffy')
    expect(image).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    expect(screen.getByText('Supported formats: JPG, PNG, GIF. Max size: 5MB')).toBeInTheDocument()
  })

  it('renders photo with hover controls for owner', () => {
    const catWithPhoto = { ...mockCat, photo_url: 'https://example.com/cat.jpg' }
    
    renderWithRouter(
      <CatPhotoManager
        cat={catWithPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )

    const image = screen.getByAltText('Photo of Fluffy')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/cat.jpg')
  })

  it('uploads photo successfully', async () => {
    const user = userEvent.setup()
    let cat = { ...mockCat }
    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={cat}
        isOwner={true}
        onPhotoUpdated={updatedCat => {
          cat = updatedCat
          mockOnPhotoUpdated(updatedCat)
          rerender(
            <CatPhotoManager
              cat={cat}
              isOwner={true}
              onPhotoUpdated={mockOnPhotoUpdated}
            />
          )
        }}
      />
    )

    const file = new File(['test'], 'cat.jpg', { type: 'image/jpeg' })
    const replaceButton = screen.getByRole('button', { name: /replace/i })
    await user.click(replaceButton)
    const fileInput = document.querySelector('input[type="file"]')!
    await user.upload(fileInput as HTMLElement, file)

    await waitFor(() => {
      expect(screen.getByAltText('Photo of Fluffy')).toHaveAttribute('src', 'https://example.com/cat.jpg')
    })
    expect(mockOnPhotoUpdated).toHaveBeenCalledWith({ ...mockCat, photo_url: 'https://example.com/cat.jpg' })
  })

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <CatPhotoManager
        cat={mockCat}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )
    const file = new File(['test'], 'fail.jpg', { type: 'image/jpeg' })
    const replaceButton = screen.getByRole('button', { name: /replace/i })
    await user.click(replaceButton)
    const fileInput = document.querySelector('input[type="file"]')!
    await user.upload(fileInput as HTMLElement, file)
    await waitFor(() => {
      expect((toast.error as any)).toHaveBeenCalledWith(expect.stringMatching(/failed to upload/i))
    })
  })

  it('deletes photo successfully', async () => {
    const user = userEvent.setup()
    // Allow photo_url to be string | undefined for test
    let cat: any = { ...mockCat, photo_url: 'https://example.com/cat.jpg' }
    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={cat}
        isOwner={true}
        onPhotoUpdated={updatedCat => {
          cat = updatedCat
          mockOnPhotoUpdated(updatedCat)
          rerender(
            <CatPhotoManager
              cat={cat}
              isOwner={true}
              onPhotoUpdated={mockOnPhotoUpdated}
            />
          )
        }}
      />
    )
    const imageContainer = screen.getByAltText('Photo of Fluffy').closest('.group')!
    await user.hover(imageContainer)
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith({ ...mockCat, photo_url: undefined })
    })
  })

  it('handles delete errors gracefully', async () => {
    const user = userEvent.setup()
    let cat: any = { ...mockCat, photo_url: 'https://example.com/cat.jpg', id: 999 }
    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={cat}
        isOwner={true}
        onPhotoUpdated={updatedCat => {
          cat = updatedCat
          mockOnPhotoUpdated(updatedCat)
          rerender(
            <CatPhotoManager
              cat={cat}
              isOwner={true}
              onPhotoUpdated={mockOnPhotoUpdated}
            />
          )
        }}
      />
    )
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    await waitFor(() => {
      expect((toast.error as any)).toHaveBeenCalledWith(expect.stringMatching(/failed to delete/i))
    })
  })

  it('shows loading states during upload and delete operations', async () => {
    const user = userEvent.setup()
    let cat = { ...mockCat }
    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={cat}
        isOwner={true}
        onPhotoUpdated={updatedCat => {
          cat = updatedCat
          rerender(
            <CatPhotoManager
              cat={cat}
              isOwner={true}
              onPhotoUpdated={mockOnPhotoUpdated}
            />
          )
        }}
      />
    )
    const file = new File(['test'], 'cat.jpg', { type: 'image/jpeg' })
    const replaceButton = screen.getByRole('button', { name: /replace/i })
    await user.click(replaceButton)
    const fileInput = document.querySelector('input[type="file"]')!
    await user.upload(fileInput as HTMLElement, file)
    // Should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument()
    })
  })
})