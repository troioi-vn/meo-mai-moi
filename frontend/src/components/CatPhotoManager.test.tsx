import { vi } from 'vitest'
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { CatPhotoManager } from './CatPhotoManager'
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

  

  it('uploads photo successfully', async () => {
    const user = userEvent.setup()
    const initialCat: Cat = { ...mockCat, photo_url: undefined, id: mockCat.id }
    renderWithRouter(
      <CatPhotoManager
        cat={initialCat}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )

    const file = new File(['test'], 'cat.jpg', { type: 'image/jpeg' })
    const uploadButton = screen.getByRole('button', { name: /replace|upload photo/i })
    await user.click(uploadButton)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(expect.objectContaining({
        photo_url: 'https://example.com/new-cat-photo.jpg',
        photo: {
          id: 1,
          cat_id: initialCat.id,
          filename: 'new-cat-photo.jpg',
          path: 'cats/profiles/new-cat-photo.jpg',
          size: 1024,
          mime_type: 'image/jpeg',
        },
      }))
    }, { timeout: 5000 })
    expect(toast.success).toHaveBeenCalledWith('Photo uploaded successfully')
  })

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup();
    const file = new File(['(⌐□_□)'], 'error.png', { type: 'image/png' });
    const mockOnPhotoUpdated = vi.fn();
    // Use id: 999 to trigger the error mock
    const errorCat = { ...mockCat, id: 999, name: 'Test Cat', photo_url: 'https://example.com/initial-cat.jpg' };
    renderWithRouter(
      <CatPhotoManager cat={errorCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    );
    const uploadButton = screen.getByRole('button', { name: /replace|upload photo/i });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.click(uploadButton);
    await user.upload(fileInput, file);
    expect(screen.getByText(/uploading.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload the photo. Please try again.');
    }, { timeout: 5000 });
    expect(mockOnPhotoUpdated).not.toHaveBeenCalled();
    expect(screen.queryByText(/uploading.../i)).not.toBeInTheDocument();
  });

  it('deletes photo successfully', async () => {
    const user = userEvent.setup()
    const catWithPhoto: Cat = { ...mockCat, photo_url: 'https://example.com/cat.jpg' }
    renderWithRouter(
      <CatPhotoManager
        cat={catWithPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )
    const imageContainer = screen.getByAltText('Photo of Fluffy').closest('.group')!
    await user.hover(imageContainer)
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(expect.objectContaining({ photo: null, photo_url: null }))
    })
    expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully')
  })

  it('handles delete errors gracefully', async () => {
    const user = userEvent.setup()
    const catWithPhoto: Cat = { ...mockCat, photo_url: 'https://example.com/cat.jpg', id: 999 }
    renderWithRouter(
      <CatPhotoManager
        cat={catWithPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )
    const imageContainer = screen.getByAltText('Photo of Fluffy').closest('.group')!
    await user.hover(imageContainer)
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete the photo. Please try again.')
    })
  })

  it('shows loading states during upload and delete operations', async () => {
    const user = userEvent.setup()
    const initialCat: Cat = { ...mockCat, photo_url: undefined }
    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={initialCat}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )
    const file = new File(['test'], 'cat.jpg', { type: 'image/jpeg' })
    const uploadButton = screen.getByRole('button', { name: /replace|upload photo/i })
    await user.click(uploadButton)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    
    // Should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument()
    }, { timeout: 5000 })

    // Test deleting loading state
    const catWithPhoto: Cat = { ...mockCat, photo_url: 'https://example.com/cat.jpg' }
    rerender(
      <CatPhotoManager
        cat={catWithPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />
    )
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)
    // Instead of using 'disabled' in getByRole options, check the attribute directly
    expect(removeButton).toBeDisabled()
    await waitFor(() => {
      expect(removeButton).not.toBeDisabled()
    }, { timeout: 5000 })
  })
})