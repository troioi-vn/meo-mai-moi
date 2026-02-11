import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, userEvent } from '@/testing'
import { PetPhotoGallery } from './PetPhotoGallery'
import type { Pet, PetPhoto } from '@/types/pet'

// Mock the API
vi.mock('@/api/generated/pet-photos/pet-photos', () => ({
  deletePetsPetPhotosPhoto: vi.fn(),
  postPetsPetPhotosPhotoSetPrimary: vi.fn(),
}))
vi.mock('@/api/generated/pets/pets', () => ({
  getPetsId: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import {
  deletePetsPetPhotosPhoto as deletePetPhoto,
  postPetsPetPhotosPhotoSetPrimary as setPrimaryPetPhoto,
} from '@/api/generated/pet-photos/pet-photos'
import { getPetsId as getPet } from '@/api/generated/pets/pets'
import { toast } from 'sonner'

const photo1: PetPhoto = {
  id: 1,
  url: 'http://example.com/photo1.jpg',
  thumb_url: 'http://example.com/thumb1.jpg',
  is_primary: true,
}
const photo2: PetPhoto = {
  id: 2,
  url: 'http://example.com/photo2.jpg',
  thumb_url: 'http://example.com/thumb2.jpg',
  is_primary: false,
}
const photo3: PetPhoto = {
  id: 3,
  url: 'http://example.com/photo3.jpg',
  thumb_url: 'http://example.com/thumb3.jpg',
  is_primary: false,
}

const mockPhotos: PetPhoto[] = [photo1, photo2, photo3]

const mockPet: Pet = {
  id: 1,
  name: 'Fluffy',
  birthday: '2020-01-01',
  country: 'VN',
  city: 'Hanoi',
  description: 'A fluffy cat',
  user_id: 1,
  pet_type_id: 1,
  status: 'active',
  photo_url: 'http://example.com/photo1.jpg',
  photos: mockPhotos,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
  pet_type: {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    is_active: true,
    is_system: true,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
  },
  user: { id: 1, name: 'Test User', email: 'test@example.com' },
}

describe('PetPhotoGallery', () => {
  const mockOnPetUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when there are no photos', () => {
    const petWithoutPhotos: Pet = { ...mockPet, photos: [] }
    const { container } = render(
      <PetPhotoGallery pet={petWithoutPhotos} onPetUpdate={mockOnPetUpdate} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the gallery with photos', () => {
    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    expect(screen.getByText('Photo Gallery (3)')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('opens modal when clicking a thumbnail', async () => {
    const user = userEvent.setup()
    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click first thumbnail to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[0]!)

    // Modal should show with action buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /current avatar/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('sets a photo as primary when clicking Set as Avatar in modal', async () => {
    const user = userEvent.setup()
    const updatedPet: Pet = {
      ...mockPet,
      photos: [{ ...photo2, is_primary: true }, { ...photo1, is_primary: false }, photo3],
    }
    vi.mocked(setPrimaryPetPhoto).mockResolvedValue(updatedPet)

    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click second thumbnail (non-primary photo) to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[1]!)

    // Click "Set as Avatar" button in modal
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set as avatar/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /set as avatar/i }))

    await waitFor(() => {
      expect(setPrimaryPetPhoto).toHaveBeenCalledWith(mockPet.id, 2)
    })

    expect(toast.success).toHaveBeenCalledWith('Avatar updated successfully', undefined)
    expect(mockOnPetUpdate).toHaveBeenCalledWith(updatedPet)
  })

  it('disables Set as Avatar button for already primary photo', async () => {
    const user = userEvent.setup()
    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click first thumbnail (primary photo) to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[0]!)

    // The "Current Avatar" button should be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /current avatar/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /current avatar/i })).toBeDisabled()
    expect(setPrimaryPetPhoto).not.toHaveBeenCalled()
  })

  it('deletes a photo when clicking delete button in modal', async () => {
    const user = userEvent.setup()
    const updatedPet: Pet = {
      ...mockPet,
      photos: [photo1, photo3],
    }
    vi.mocked(deletePetPhoto).mockResolvedValue()
    vi.mocked(getPet).mockResolvedValue(updatedPet)

    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click second thumbnail to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[1]!)

    // Click Delete button in modal
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(deletePetPhoto).toHaveBeenCalledWith(mockPet.id, '2')
    })

    expect(toast.success).toHaveBeenCalledWith('Photo deleted successfully', undefined)
    expect(getPet).toHaveBeenCalledWith(mockPet.id)
    expect(mockOnPetUpdate).toHaveBeenCalledWith(updatedPet)
  })

  it('handles set primary error gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(setPrimaryPetPhoto).mockRejectedValue(new Error('Network error'))

    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click second thumbnail to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[1]!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set as avatar/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /set as avatar/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update avatar', undefined)
    })

    expect(mockOnPetUpdate).not.toHaveBeenCalled()
  })

  it('handles delete error gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(deletePetPhoto).mockRejectedValue(new Error('Network error'))

    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // Click first thumbnail to open modal
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    await user.click(thumbnails[0]!)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete photo', undefined)
    })

    expect(mockOnPetUpdate).not.toHaveBeenCalled()
  })

  it('shows star badge on primary photo thumbnail', () => {
    render(<PetPhotoGallery pet={mockPet} onPetUpdate={mockOnPetUpdate} />)

    // The primary photo thumbnail should have a star icon
    const thumbnails = screen.getAllByRole('button', { name: /pet photo/i })
    const firstThumbnail = thumbnails[0]
    expect(firstThumbnail?.querySelector('svg.lucide-star')).toBeInTheDocument()
  })

  it('renders with single photo', () => {
    const petWithOnePhoto: Pet = {
      ...mockPet,
      photos: [photo1],
    }

    render(<PetPhotoGallery pet={petWithOnePhoto} onPetUpdate={mockOnPetUpdate} />)

    expect(screen.getByText('Photo Gallery (1)')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })
})
