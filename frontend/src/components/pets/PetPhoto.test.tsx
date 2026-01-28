import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PetPhoto } from './PetPhoto'
import { mockPet } from '@/testing/mocks/data/pets'
import { api } from '@/api/axios'

// Mock the API
vi.mock('@/api/axios', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock the pets API
vi.mock('@/api/generated/pets/pets', () => ({
  getPetsId: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockApi = vi.mocked(api)
import { getPetsId as getPet } from '@/api/generated/pets/pets'

describe('PetPhoto', () => {
  const mockOnPhotoUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders pet photo', () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} />)

    const img = screen.getByRole('img', { name: mockPet.name })
    expect(img).toHaveAttribute('src', mockPet.photo_url)
  })

  it('shows upload controls when enabled', () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('hides upload controls when disabled', () => {
    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={false} />)

    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('hides remove button when pet has no photo', () => {
    const petWithoutPhoto = { ...mockPet, photo_url: undefined }

    render(
      <PetPhoto pet={petWithoutPhoto} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />
    )

    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('uploads photo successfully', async () => {
    const user = userEvent.setup()
    const mockResponse = { ...mockPet, photo_url: 'http://example.com/new-photo.jpg' }
    mockApi.post.mockResolvedValue(mockResponse)

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /upload/i })

    await user.click(fileInput)

    // Find the hidden file input and upload file
    const hiddenInput = document.querySelector('input[type="file"]')!
    await user.upload(hiddenInput, file)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        `/pets/${mockPet.id}/photos`,
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
    })

    expect(mockOnPhotoUpdate).toHaveBeenCalledWith(mockResponse)
  })

  it('deletes photo successfully', async () => {
    const user = userEvent.setup()
    const updatedPet = { ...mockPet, photo_url: undefined, photos: [] }
    mockApi.delete.mockResolvedValue({})
    vi.mocked(getPet).mockResolvedValue(updatedPet)

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith(`/pets/${mockPet.id}/photos/current`)
    })

    await waitFor(() => {
      expect(getPet).toHaveBeenCalledWith(mockPet.id)
    })

    expect(mockOnPhotoUpdate).toHaveBeenCalledWith(updatedPet)
  })

  it('handles upload error', async () => {
    const user = userEvent.setup()
    mockApi.post.mockRejectedValue(new Error('Upload failed'))

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /upload/i })

    await user.click(fileInput)

    const hiddenInput = document.querySelector('input[type="file"]')!
    await user.upload(hiddenInput, file)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalled()
    })

    // onPhotoUpdate should not be called on error
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled()
  })

  it('validates file type', async () => {
    const user = userEvent.setup()

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    const file = new File(['test'], 'test.txt', { type: 'text/plain' })
    const fileInput = screen.getByRole('button', { name: /upload/i })

    await user.click(fileInput)

    const hiddenInput = document.querySelector('input[type="file"]')!
    await user.upload(hiddenInput, file)

    // API should not be called for invalid file type
    expect(mockApi.post).not.toHaveBeenCalled()
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled()
  })

  it('validates file size', async () => {
    const user = userEvent.setup()

    render(<PetPhoto pet={mockPet} onPhotoUpdate={mockOnPhotoUpdate} showUploadControls={true} />)

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /upload/i })

    await user.click(fileInput)

    const hiddenInput = document.querySelector('input[type="file"]')!
    await user.upload(hiddenInput, largeFile)

    // API should not be called for oversized file
    expect(mockApi.post).not.toHaveBeenCalled()
    expect(mockOnPhotoUpdate).not.toHaveBeenCalled()
  })
})
