import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
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
    get: vi.fn(() => Promise.resolve({ data: { data: {} } })),
  },
}))

const mockOnPhotoUpdated = vi.fn()

describe('CatPhotoManager', () => {
  let mockApiPost: Mock
  let mockApiDelete: Mock
  let mockToastSuccess: Mock
  let mockToastError: Mock
  beforeEach(() => {
    mockOnPhotoUpdated.mockClear()
    mockApiPost = vi.spyOn(api, 'post')
    mockApiDelete = vi.spyOn(api, 'delete')
    mockToastSuccess = vi.spyOn(toast, 'success')
    mockToastError = vi.spyOn(toast, 'error')
    
    // Set default mock implementations
    mockApiPost.mockResolvedValue({ data: { data: {} } })
    mockApiDelete.mockResolvedValue({})
    mockToastSuccess.mockImplementation(() => {})
    mockToastError.mockImplementation(() => {})
  })

  it('renders correctly when cat has a photo and user is owner', async () => {
    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByAltText(`Photo of ${mockCat.name}`)).toBeInTheDocument()
      expect(screen.getByText('Replace')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })
  })

  it('renders correctly when cat has no photo and user is owner', async () => {
    const catWithoutPhoto: Cat = { ...mockCat, photo_url: undefined }
    renderWithRouter(
      <CatPhotoManager cat={catWithoutPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByText('No photo uploaded')).toBeInTheDocument()
      expect(screen.getByText('Upload Photo')).toBeInTheDocument()
    })
  })

  it('renders correctly when user is not owner', async () => {
    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={false} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByAltText(`Photo of ${mockCat.name}`)).toBeInTheDocument()
      expect(screen.queryByText('Replace')).not.toBeInTheDocument()
      expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    })
  })

  it('handles photo upload correctly', async () => {
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' })
    const updatedCat = {
      ...mockCat,
      photo: { id: 2, url: 'new_photo_url' },
      photo_url: 'new_photo_url',
    }
    vi.mocked(api.post).mockResolvedValue({ data: { data: updatedCat } })

    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )

    const fileInput = screen.getByLabelText('Upload Photo')
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        `/cats/${String(mockCat.id)}/photos`,
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
    })

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(updatedCat)
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Photo uploaded successfully')
    })
  })

  it('handles photo delete correctly', async () => {
    vi.mocked(api.delete).mockResolvedValue({})

    renderWithRouter(
      <CatPhotoManager cat={mockCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )

    const removeButton = screen.getByText('Remove')
    await userEvent.click(removeButton)

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith(`/cats/${String(mockCat.id)}/photos/`)
    })

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith({
        ...mockCat,
        photo: null,
        photo_url: undefined,
      })
    })

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Photo deleted successfully')
    })
  })
})
