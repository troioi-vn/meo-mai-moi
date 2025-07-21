import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CatPhotoManager } from './CatPhotoManager'
import { renderWithRouter } from '../test-utils'
import { mockCat } from '../mocks/data/cats'
import type { Cat } from '@/types/cat'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

import { toast } from 'sonner'

const mockOnPhotoUpdated = vi.fn()

describe('CatPhotoManager', () => {
  beforeEach(() => {
    mockOnPhotoUpdated.mockClear()
    vi.spyOn(toast, 'success').mockImplementation(() => {})
    vi.spyOn(toast, 'error').mockImplementation(() => {})

    server.use(
      http.post('http://localhost:3000/api/cats/1/photos', () => {
        return HttpResponse.json({
          data: { ...mockCat, photo_url: 'new_photo_url' },
        })
      }),
      http.delete('http://localhost:3000/api/cats/1/photos/', () => {
        return HttpResponse.json(
          { message: 'Failed to delete photo. Please try again.' },
          { status: 500 }
        )
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        })
      }),
    )
  })

  afterEach(() => {
    // No need to use vi.useRealTimers() if vi.useFakeTimers() is not used
  })

  it('renders correctly when cat has a photo and user is owner', async () => {
    const catWithPhoto = { ...mockCat, photo_url: 'some_photo_url' }
    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByAltText(`Photo of ${catWithPhoto.name}`)).toBeInTheDocument()
      expect(screen.getByText('Replace')).toBeInTheDocument()
      expect(screen.getByText('Remove')).toBeInTheDocument()
    })
  })

  it('renders correctly when cat has no photo and user is owner', async () => {
    const catNoPhoto = { ...mockCat, photo_url: undefined }
    renderWithRouter(
      <CatPhotoManager cat={catNoPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByText('No photo uploaded')).toBeInTheDocument()
      expect(screen.getByText('Click below to add one')).toBeInTheDocument()
      expect(screen.getByText('Upload Photo')).toBeInTheDocument()
    })
  })

  it('renders correctly when user is not owner', async () => {
    const catWithPhoto = { ...mockCat, photo_url: 'some_photo_url' }
    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={false} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    await waitFor(() => {
      expect(screen.getByAltText(`Photo of ${catWithPhoto.name}`)).toBeInTheDocument()
      expect(screen.queryByText('Replace')).not.toBeInTheDocument()
      expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    })
  })

  it('handles photo upload correctly', async () => {
    const user = userEvent.setup()
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' })
    const catWithoutPhoto: Cat = { ...mockCat, id: 1, photo_url: undefined }
    const updatedCat: Cat = { ...catWithoutPhoto, photo_url: 'new_photo_url' }

    const { rerender } = renderWithRouter(
      <CatPhotoManager
        cat={catWithoutPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />,
    )

    const fileInput = screen.getByLabelText(/upload photo/i)
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(updatedCat)
    })

    rerender(
      <CatPhotoManager cat={updatedCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo uploaded successfully')
    })

    expect(screen.getByRole('img')).toHaveAttribute('src', 'new_photo_url')
  })

  it('handles photo delete correctly', async () => {
    const user = userEvent.setup()
    const catWithPhoto: Cat = { ...mockCat, id: 1, photo_url: 'some_photo_url' }
    const updatedCat: Cat = { ...catWithPhoto, photo_url: undefined, photo: null }

    const { rerender } = renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await userEvent.click(removeButton)

    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(updatedCat)
    })

    rerender(
      <CatPhotoManager cat={updatedCat} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully')
    })

    expect(screen.getByText('No photo uploaded')).toBeInTheDocument()
  })

  it('handles photo upload error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.post('http://localhost:3000/api/cats/1/photos', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    const user = userEvent.setup()
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' })
    const catWithoutPhoto: Cat = { ...mockCat, id: 1, photo_url: undefined }

    renderWithRouter(
      <CatPhotoManager
        cat={catWithoutPhoto}
        isOwner={true}
        onPhotoUpdated={mockOnPhotoUpdated}
      />,
    )

    const fileInput = screen.getByLabelText(/upload photo/i)
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to upload photo. Please try again.')
    })
    vi.restoreAllMocks();
  })

  it('handles photo delete error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(
      http.delete('http://localhost:3000/api/cats/1/photos/', () => {
        return HttpResponse.json(
          { message: 'Failed to delete photo. Please try again.' },
          { status: 500 }
        )
      }),
    )

    const user = userEvent.setup()
    const catWithPhoto: Cat = { ...mockCat, id: 1, photo_url: 'some_photo_url' }

    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />,
    )

    const removeButton = screen.getByRole('button', { name: /remove/i })
    await userEvent.click(removeButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete photo. Please try again.')
    })
    vi.restoreAllMocks();
  })
})

