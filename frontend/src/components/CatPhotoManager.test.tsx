import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CatPhotoManager } from './CatPhotoManager'
import { renderWithRouter } from '../test-utils'
import { mockCat } from '../mocks/data/cats'
import type { Cat } from '@/types/cat'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'

// Mock the toast module
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockOnPhotoUpdated = vi.fn()

describe('CatPhotoManager', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Test for successful photo upload ---
  // it('handles photo upload correctly', async () => {
  //   // ARRANGE
  //   const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
  //   const catWithoutPhoto: Cat = { ...mockCat, id: 1, photo: null, photo_url: undefined };
  //   const expectedUpdatedCat: Cat = { ...mockCat, id: 1, photo_url: 'new_photo_url' };

  //   server.use(
  //     http.post('http://localhost:3000/api/cats/1/photos', () => {
  //       return HttpResponse.json({ data: expectedUpdatedCat });
  //     })
  //   );

  //   renderWithRouter(
  //     <CatPhotoManager
  //       cat={catWithoutPhoto}
  //       isOwner={true}
  //       onPhotoUpdated={mockOnPhotoUpdated}
  //     />
  //   );

  //   // ACT
  //   const fileInput = screen.getByLabelText(/upload photo/i);
  //   await user.upload(fileInput, file);

  //   // ASSERT
  //   await waitFor(() => {
  //     expect(toast.success).toHaveBeenCalledWith('Photo uploaded successfully');
  //   });
  //   await waitFor(() => {
  //       expect(mockOnPhotoUpdated).toHaveBeenCalledWith(expectedUpdatedCat);
  //   });
  // });

  // --- Test for photo upload failure ---
  // it('handles photo upload error', async () => {
  //   // ARRANGE
  //   server.use(
  //     http.post('http://localhost:3000/api/cats/1/photos', () => {
  //       return new HttpResponse(null, { status: 500 });
  //     })
  //   );

  //   const file = new File(['(⌐□_□)'], 'error.png', { type: 'image/png' });
  //   const catWithoutPhoto: Cat = { ...mockCat, id: 1, photo_url: undefined, photo: null };

  //   renderWithRouter(
  //     <CatPhotoManager
  //       cat={catWithoutPhoto}
  //       isOwner={true}
  //       onPhotoUpdated={mockOnPhotoUpdated}
  //     />
  //   );

  //   // ACT
  //   const fileInput = screen.getByLabelText(/upload photo/i);
  //   await user.upload(fileInput, file);

  //   // ASSERT
  //   await waitFor(() => {
  //     expect(toast.error).toHaveBeenCalledWith('Request failed with status code 500');
  //   });
  //   expect(mockOnPhotoUpdated).not.toHaveBeenCalled();
  // });

  // --- Test for successful photo deletion ---
  it('handles photo delete correctly', async () => {
    // ARRANGE
    const catWithPhoto: Cat = {
      ...mockCat,
      id: 1,
      photo: { id: 99, url: 'some_photo_url' },
      photo_url: 'some_photo_url',
    }
    const expectedUpdatedCat: Cat = { ...catWithPhoto, photo: null, photo_url: undefined }

    server.use(
      http.delete('http://localhost:3000/api/cats/1/photos/99', () => {
        return new HttpResponse(null, { status: 200 })
      })
    )

    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )

    // ACT
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    // ASSERT
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully')
    })
    await waitFor(() => {
      expect(mockOnPhotoUpdated).toHaveBeenCalledWith(expectedUpdatedCat)
    })
  })

  // --- Test for photo deletion failure ---
  it('handles photo delete error', async () => {
    // ARRANGE
    const catWithPhoto: Cat = {
      ...mockCat,
      id: 1,
      photo: { id: 99, url: 'some_photo_url' },
      photo_url: 'some_photo_url',
    }

    server.use(
      http.delete('http://localhost:3000/api/cats/1/photos/99', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )

    // ACT
    const removeButton = screen.getByRole('button', { name: /remove/i })
    await user.click(removeButton)

    // ASSERT
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Request failed with status code 500')
    })
    expect(mockOnPhotoUpdated).not.toHaveBeenCalled()
  })

  // --- Non-failing tests for regression ---
  it('renders correctly when cat has a photo and user is owner', async () => {
    const catWithPhoto = {
      ...mockCat,
      id: 1,
      photo: { id: 99, url: 'some_photo_url' },
      photo_url: 'some_photo_url',
    }
    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    expect(screen.getByAltText(`Photo of ${catWithPhoto.name}`)).toBeInTheDocument()
    expect(screen.getByText('Replace')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
  })

  it('renders correctly when cat has no photo and user is owner', async () => {
    const catNoPhoto = { ...mockCat, id: 1, photo: null, photo_url: undefined }
    renderWithRouter(
      <CatPhotoManager cat={catNoPhoto} isOwner={true} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    expect(screen.getByText('No photo uploaded')).toBeInTheDocument()
    expect(screen.getByText('Upload Photo')).toBeInTheDocument()
  })

  it('renders correctly when user is not owner', async () => {
    const catWithPhoto = {
      ...mockCat,
      id: 1,
      photo: { id: 99, url: 'some_photo_url' },
      photo_url: 'some_photo_url',
    }
    renderWithRouter(
      <CatPhotoManager cat={catWithPhoto} isOwner={false} onPhotoUpdated={mockOnPhotoUpdated} />
    )
    expect(screen.getByAltText(`Photo of ${catWithPhoto.name}`)).toBeInTheDocument()
    expect(screen.queryByText('Replace')).not.toBeInTheDocument()
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })
})
