import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import { ActivePlacementRequestsSection } from './ActivePlacementRequestsSection'
import { getPetsPlacementRequests } from '@/api/generated/pets/pets'
import type { Pet, PetType } from '@/types/pet'

// Mock the API function with a strongly-typed mocked function
vi.mock('@/api/generated/pets/pets', () => ({
  getPetsPlacementRequests: vi.fn() as unknown as MockedFunction<() => Promise<Pet[]>>,
}))

// Mock the PetCard component
vi.mock('@/components/pets/PetCard', () => ({
  PetCard: ({ pet }: { pet: Pet }) => (
    <div data-testid={`pet-card-${String(pet.id)}`}>
      <h3>{pet.name}</h3>
      <span>{pet.pet_type.name}</span>
    </div>
  ),
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const mockCatType: PetType = {
  id: 1,
  name: 'Cat',
  slug: 'cat',
  description: 'Feline companions',
  is_active: true,
  is_system: true,
  display_order: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

// Mock pet data for testing
const createMockPet = (id: number, name: string, petType: PetType = mockCatType): Pet => ({
  id,
  name,
  birthday: '2020-01-15',
  status: 'active',
  description: 'A friendly pet',
  country: 'US',
  state: 'NY',
  city: 'New York',
  address: '',
  photo_url: 'http://example.com/pet.jpg',
  user_id: 1,
  pet_type_id: petType.id,
  pet_type: petType,
  user: {
    id: 1,
    name: 'Owner',
    email: 'owner@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  placement_requests: [
    {
      id: id,
      pet_id: id,
      request_type: 'fostering',
      status: 'open',
      notes: 'Looking for help',
      created_at: '2025-07-20T00:00:00Z',
      updated_at: '2025-07-20T00:00:00Z',
    },
  ],
  placement_request_active: true,
})

describe('ActivePlacementRequestsSection', () => {
  const mockGetPlacementRequests = getPetsPlacementRequests as unknown as MockedFunction<
    () => Promise<Pet[]>
  >

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper that returns a never-resolving promise with an explicit never type
  const neverResolved = (): Promise<never> => new Promise<never>(() => {})

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Loading State', () => {
    it('displays loading skeleton cards while fetching data', async () => {
      // Mock API to never resolve to test loading state
      mockGetPlacementRequests.mockImplementation(() => neverResolved())

      renderWithRouter(<ActivePlacementRequestsSection />)

      // Check for section title
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()

      // Check for skeleton loading cards (should be 4) by looking for skeleton components
      const skeletonElements = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletonElements.length).toBeGreaterThanOrEqual(4) // Each card has multiple skeleton elements

      // Verify skeleton card containers
      const skeletonCards = document.querySelectorAll('.rounded-lg.border.bg-card')
      expect(skeletonCards).toHaveLength(4)
    })

    it('shows proper loading structure with skeleton elements', () => {
      mockGetPlacementRequests.mockImplementation(() => neverResolved())

      renderWithRouter(<ActivePlacementRequestsSection />)

      // Check that skeleton cards have proper structure by looking for skeleton components
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThanOrEqual(4)

      // Verify grid layout is applied
      const grid = screen.getByText('Active Placement Requests').nextElementSibling
      expect(grid).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4',
        'gap-6'
      )
    })
  })

  describe('Error State', () => {
    it('displays error message when API call fails', async () => {
      const errorMessage = 'Network error'
      mockGetPlacementRequests.mockRejectedValue(new Error(errorMessage))

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load placement requests. Please try again later.')
        ).toBeInTheDocument()
      })

      // Check for additional error messaging
      expect(
        screen.getByText(/We're having trouble loading the placement requests/)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('allows retry when error occurs', async () => {
      // First call fails, second call succeeds
      mockGetPlacementRequests
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([createMockPet(1, 'Fluffy')])

      renderWithRouter(<ActivePlacementRequestsSection />)

      // Wait for error state
      await waitFor(() => {
        expect(
          screen.getByText('Failed to load placement requests. Please try again later.')
        ).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(retryButton)

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
        expect(screen.getByText('Fluffy')).toBeInTheDocument()
      })

      // Verify API was called twice
      expect(mockGetPlacementRequests).toHaveBeenCalledTimes(2)
    })

    it('shows loading state during retry', async () => {
      mockGetPlacementRequests
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation(() => neverResolved()) // Never resolves for loading test

      renderWithRouter(<ActivePlacementRequestsSection />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(retryButton)

      // Should show loading state again
      await waitFor(() => {
        const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
        expect(skeletons.length).toBeGreaterThanOrEqual(4)
      })
    })
  })

  describe('Empty State', () => {
    it('displays empty state message when no cats are returned', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      })

      expect(screen.getByText('Check back soon for pets needing help!')).toBeInTheDocument()
      expect(screen.getByText('🐾')).toBeInTheDocument()
    })

    it('does not show "Show more" button in empty state', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'View All Requests' })).not.toBeInTheDocument()
    })
  })

  describe('Populated State', () => {
    it('renders pet cards when data is available', async () => {
      const mockPets = [createMockPet(1, 'Fluffy'), createMockPet(2, 'Whiskers')]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
        expect(screen.getByTestId(`pet-card-${String(2)}`)).toBeInTheDocument()
      })

      expect(screen.getByText('Fluffy')).toBeInTheDocument()
      expect(screen.getByText('Whiskers')).toBeInTheDocument()
    })

    it('applies proper grid layout classes', async () => {
      const mockPets = [createMockPet(1, 'Fluffy')]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
      })

      // Check grid container classes
      const grid = screen.getByText('Active Placement Requests').nextElementSibling
      expect(grid).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4',
        'gap-6'
      )
    })
  })

  describe('Client-side Limiting', () => {
    it('limits display to maximum 4 pets when more are available', async () => {
      const mockPets = [
        createMockPet(1, 'Pet1'),
        createMockPet(2, 'Pet2'),
        createMockPet(3, 'Pet3'),
        createMockPet(4, 'Pet4'),
        createMockPet(5, 'Pet5'),
        createMockPet(6, 'Pet6'),
      ]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
      })

      // Should only show first 4 pets
      expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
      expect(screen.getByTestId(`pet-card-${String(2)}`)).toBeInTheDocument()
      expect(screen.getByTestId(`pet-card-${String(3)}`)).toBeInTheDocument()
      expect(screen.getByTestId(`pet-card-${String(4)}`)).toBeInTheDocument()

      // Should not show 5th and 6th pets
      expect(screen.queryByTestId(`pet-card-${String(5)}`)).not.toBeInTheDocument()
      expect(screen.queryByTestId(`pet-card-${String(6)}`)).not.toBeInTheDocument()
    })

    it('shows all pets when 4 or fewer are available', async () => {
      const mockPets = [
        createMockPet(1, 'Pet1'),
        createMockPet(2, 'Pet2'),
        createMockPet(3, 'Pet3'),
      ]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
      })

      // Should show all 3 pets
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-2')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-3')).toBeInTheDocument()
    })
  })

  describe('Show More Button Logic', () => {
    it('shows "Show more" button when more than 4 pets are available', async () => {
      const mockPets = Array.from({ length: 6 }, (_, i) => createMockPet(i + 1, `Pet${i + 1}`))
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
      })
    })

    it('does not show "Show more" button when 4 or fewer pets are available', async () => {
      const mockPets = [
        createMockPet(1, 'Pet1'),
        createMockPet(2, 'Pet2'),
        createMockPet(3, 'Pet3'),
        createMockPet(4, 'Pet4'),
      ]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId(`pet-card-${String(1)}`)).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'View All Requests' })).not.toBeInTheDocument()
    })

    it('does not show "Show more" button when exactly 4 pets are available', async () => {
      const mockPets = Array.from({ length: 4 }, (_, i) => createMockPet(i + 1, `Pet${i + 1}`))
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: 'View All Requests' })).not.toBeInTheDocument()
    })

    it('shows "Show more" button when exactly 5 pets are available', async () => {
      const mockPets = Array.from({ length: 5 }, (_, i) => createMockPet(i + 1, `Pet${i + 1}`))
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('navigates to /requests page when "Show more" button is clicked', async () => {
      const mockPets = Array.from({ length: 6 }, (_, i) => createMockPet(i + 1, `Pet${i + 1}`))
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
      })

      const showMoreButton = screen.getByRole('button', { name: 'View All Requests' })
      fireEvent.click(showMoreButton)

      expect(mockNavigate).toHaveBeenCalledWith('/requests')
      expect(mockNavigate).toHaveBeenCalledTimes(1)
    })

    it('applies proper styling to "Show more" button', async () => {
      const mockPets = Array.from({ length: 6 }, (_, i) => createMockPet(i + 1, `Pet${i + 1}`))
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
      })

      const showMoreButton = screen.getByRole('button', { name: 'View All Requests' })
      expect(showMoreButton).toHaveClass(
        'transition-all',
        'duration-200',
        'hover:scale-105',
        'focus:scale-105'
      )
    })
  })

  describe('Component Props', () => {
    it('applies custom className when provided', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection className="custom-class" />)

      await waitFor(() => {
        expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      })

      const section = screen.getByText('Active Placement Requests').closest('section')
      expect(section).toHaveClass('custom-class')
    })

    it('applies default classes when no className is provided', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      })

      const section = screen.getByText('Active Placement Requests').closest('section')
      expect(section).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')
    })
  })

  describe('API Integration', () => {
    it('calls getPlacementRequests API on component mount', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(mockGetPlacementRequests).toHaveBeenCalledTimes(1)
      })
    })

    it('handles API response correctly', async () => {
      const mockPets = [createMockPet(1, 'TestPet')]
      mockGetPlacementRequests.mockResolvedValue(mockPets)

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
        expect(screen.getByText('TestPet')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy with h2 for section title', async () => {
      mockGetPlacementRequests.mockResolvedValue([])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: 'Active Placement Requests' })
        ).toBeInTheDocument()
      })
    })

    it('maintains semantic structure in all states', async () => {
      mockGetPlacementRequests.mockResolvedValue([createMockPet(1, 'TestPet')])

      renderWithRouter(<ActivePlacementRequestsSection />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      })

      // Check that section element is used
      const section = screen.getByRole('heading', { level: 2 }).closest('section')
      expect(section).toBeInTheDocument()
    })
  })
})
