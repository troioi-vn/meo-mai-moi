import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatPhotoManager } from './CatPhotoManager'
import { renderWithRouter } from '../test-utils'
import { mockCat } from '../mocks/data/cats'
import type { Cat } from '@/types/cat'

import { api } from '@/api/axios'
import { toast } from 'sonner'

// Mock the api module
vi.mock('@/api/axios', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the sonner module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockOnPhotoUpdated = vi.fn()

describe('CatPhotoManager', () => {
beforeEach(() => {
  mockOnPhotoUpdated.mockClear();
  // Reset mocks before each test
  vi.mocked(api.post).mockReset();
  vi.mocked(api.delete).mockReset();
  // Set default mock implementations
  vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
  vi.mocked(api.delete).mockResolvedValue({});
});

  it('renders correctly when cat has a photo and user is owner', () => {
    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    expect(screen.getByAltText(`Photo of ${mockCat.name}`)).toBeInTheDocument()
    expect(screen.getByText('Replace')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('renders correctly when cat has no photo and user is owner', () => {
    const catWithoutPhoto: Cat = { ...mockCat, photo_url: undefined }
    renderWithRouter(
      <CatPhotoManager cat={catWithoutPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    expect(screen.getByText('No photo uploaded')).toBeInTheDocument()
    expect(screen.getByText('Upload Photo')).toBeInTheDocument()
  })

  it('renders correctly when user is not owner', () => {
    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={false} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    expect(screen.getByAltText(`Photo of ${mockCat.name}`)).toBeInTheDocument()
    expect(screen.queryByText('Replace')).not.toBeInTheDocument()
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })

  it('handles photo upload correctly', async () => {
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' })
    const updatedCat = { ...mockCat, photo: { id: 2, url: 'new_photo_url' }, photo_url: 'new_photo_url' };
    vi.mocked(api.post).mockResolvedValue({ data: { data: updatedCat } });

    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    const fileInput = screen.getByLabelText('Upload Photo')
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/cats/${String(mockCat.id)}/photos`, expect.any(FormData), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    })

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(updatedCat)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo uploaded successfully')
    })
  })

  it('handles photo delete correctly', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    const removeButton = screen.getByText('Remove')
    await userEvent.click(removeButton)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/cats/${String(mockCat.id)}/photos/`)
    })

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith({ ...mockCat, photo: null, photo_url: undefined })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully')
    })
  })
})