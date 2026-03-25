import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter } from '@/testing'
import MyPetsPage from './MyPetsPage'
import type { Pet, PetType } from '@/types/pet'

// Mutable state for the hook mock
let mockSectionsData:
  | {
      owned: Pet[]
      fostering_active: Pet[]
      fostering_past: Pet[]
      transferred_away: Pet[]
    }
  | undefined = undefined
let mockSectionsLoading = true
let mockSectionsError: Error | null = null
let mockIsOnline = true

// Mock the API hook
vi.mock('@/api/generated/pets/pets', () => ({
  getGetMyPetsSectionsQueryKey: () => ['/my-pets/sections'] as const,
  getGetMyPetsQueryKey: () => ['/my-pets'] as const,
  getGetPetsFeaturedQueryKey: () => ['/pets/featured'] as const,
  useGetMyPetsSections: () => ({
    data: mockSectionsData,
    isLoading: mockSectionsLoading,
    isError: mockSectionsError !== null,
  }),
}))

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => mockIsOnline,
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

// Mock the PetCardCompact component
vi.mock('@/components/pets/PetCardCompact', () => ({
  PetCardCompact: ({ pet }: { pet: Pet }) => (
    <div data-testid={`pet-card-compact-${String(pet.id)}`}>
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

const mockCatType: PetType = {
  id: 1,
  name: 'Cat',
  slug: 'cat',
  description: 'Feline companions',
  is_active: true,
  is_system: true,
  display_order: 1,
  placement_requests_allowed: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockDogType: PetType = {
  id: 2,
  name: 'Dog',
  slug: 'dog',
  description: 'Canine companions',
  is_active: true,
  is_system: true,
  display_order: 2,
  placement_requests_allowed: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const createMockPet = (
  id: number,
  name: string,
  status: 'active' | 'deceased' = 'active',
  petType: PetType = mockCatType
): Pet => ({
  id,
  name,
  birthday: '2020-01-01',
  country: 'VN',
  city: 'Test Location',
  description: 'Test Description',
  user_id: 1,
  pet_type_id: petType.id,
  status,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  pet_type: petType,
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  },
})

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
}

// Helper to render with authenticated user by default
const renderAuthenticatedPage = () => {
  return renderWithRouter(<MyPetsPage />, {
    initialAuthState: { user: mockUser, isLoading: false, isAuthenticated: true },
  })
}

const getCreatePetButton = () => document.querySelector('button[data-variant="default"]')

describe('MyPetsPage', () => {
  /** Helper to set mock data for a "loaded" state */
  const setMockSections = (sections: {
    owned: Pet[]
    fostering_active: Pet[]
    fostering_past: Pet[]
    transferred_away: Pet[]
  }) => {
    mockSectionsData = sections
    mockSectionsLoading = false
    mockSectionsError = null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockSectionsData = undefined
    mockSectionsLoading = true
    mockSectionsError = null
    mockIsOnline = true
  })

  it('renders page title and new pet button', async () => {
    const ownedPets = [createMockPet(1, 'Fluffy', 'active', mockCatType)]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(getCreatePetButton()).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    // Defaults: mockSectionsLoading = true, mockSectionsData = undefined

    renderAuthenticatedPage()

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    mockSectionsError = new Error('API Error')
    mockSectionsLoading = false

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(document.querySelector('p.text-destructive')).toBeInTheDocument()
    })
  })

  it('shows empty state when no pets exist', async () => {
    setMockSections({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(document.querySelector('[data-slot="empty"]')).toBeInTheDocument()
      expect(getCreatePetButton()).toBeInTheDocument()
    })
  })

  it('renders owned pets section', async () => {
    const ownedPets = [
      createMockPet(1, 'Fluffy', 'active', mockCatType),
      createMockPet(2, 'Buddy', 'active', mockDogType),
    ]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      // No more 'Owned' header displayed
      expect(screen.queryByText('Owned')).not.toBeInTheDocument()
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-2')).toBeInTheDocument()
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
      expect(screen.getByText('Buddy')).toBeInTheDocument()
    })
  })

  it('renders fostering sections', async () => {
    const activeFostering = [createMockPet(3, 'Foster Cat', 'active')]
    const pastFostering = [createMockPet(4, 'Past Foster', 'active')]

    setMockSections({
      owned: [],
      fostering_active: activeFostering,
      fostering_past: pastFostering,
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2)
      expect(screen.getByTestId('pet-card-3')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-4')).toBeInTheDocument()
    })
  })

  it('renders transferred away section', async () => {
    const transferredAway = [createMockPet(5, 'Transferred Pet', 'active')]

    setMockSections({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: transferredAway,
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByTestId('pet-card-5')).toBeInTheDocument()
    })
  })

  it('filters out deceased pets by default', async () => {
    const ownedPets = [
      createMockPet(1, 'Alive Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      expect(screen.queryByTestId('pet-card-2')).not.toBeInTheDocument()
      expect(screen.getByText('Alive Pet')).toBeInTheDocument()
      expect(screen.queryByText('Deceased Pet')).not.toBeInTheDocument()
    })
  })

  it('shows deceased pets when toggle is enabled', async () => {
    const ownedPets = [
      createMockPet(1, 'Alive Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })

    // Toggle show all
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-2')).toBeInTheDocument()
      expect(screen.getByText('Alive Pet')).toBeInTheDocument()
      expect(screen.getByText('Deceased Pet')).toBeInTheDocument()
    })
  })

  it('navigates to create pet page when new pet button is clicked', async () => {
    const ownedPets = [createMockPet(1, 'Fluffy', 'active', mockCatType)]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(getCreatePetButton()).toBeInTheDocument()
    })

    const newPetButton = getCreatePetButton()
    expect(newPetButton).toBeInTheDocument()
    fireEvent.click(newPetButton)

    expect(mockNavigate).toHaveBeenCalledWith('/pets/create')
  })

  it('navigates to create pet page from empty state button', async () => {
    setMockSections({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(getCreatePetButton()).toBeInTheDocument()
    })

    const addFirstPetButton = getCreatePetButton()
    expect(addFirstPetButton).toBeInTheDocument()
    fireEvent.click(addFirstPetButton)

    expect(mockNavigate).toHaveBeenCalledWith('/pets/create')
  })

  it('shows unauthenticated message when user is not logged in', () => {
    mockSectionsLoading = false

    renderWithRouter(<MyPetsPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    expect(screen.getByText('Please log in to view your pets.')).toBeInTheDocument()
  })

  it('renders cached pets offline even when auth is unavailable after reload', async () => {
    mockIsOnline = false
    setMockSections({
      owned: [createMockPet(1, 'Offline Fluffy', 'active', mockCatType)],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithRouter(<MyPetsPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByText('Offline Fluffy')).toBeInTheDocument()
      expect(screen.queryByText('Please log in to view your pets.')).not.toBeInTheDocument()
    })

    expect(getCreatePetButton()).not.toBeInTheDocument()
  })

  it('displays show all toggle with correct label', async () => {
    const ownedPets = [
      createMockPet(1, 'Active Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })
  })

  it('hides show all toggle when there are no deceased pets', async () => {
    const ownedPets = [createMockPet(1, 'Active Pet', 'active')]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('applies proper grid layout to pet sections', async () => {
    const ownedPets = [createMockPet(1, 'Test Pet', 'active')]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })

    // Check that the grid container has proper classes
    const gridContainer = screen.getByTestId('pet-card-1').closest('.grid')
    expect(gridContainer).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'md:grid-cols-3',
      'lg:grid-cols-4',
      'gap-8'
    )
  })

  describe('filtering', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('toggles filter panel visibility', async () => {
      setMockSections({
        owned: [
          createMockPet(1, 'Cat', 'active', mockCatType),
          createMockPet(2, 'Dog', 'active', mockDogType),
        ],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      })

      renderAuthenticatedPage()

      await waitFor(() => {
        expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
      })

      // Panel should be hidden initially
      expect(screen.queryByText('Pet type')).not.toBeInTheDocument()

      const filterToggle = screen.getByLabelText('Filters')
      fireEvent.click(filterToggle)

      // Sub-titles or identifiers in PetFilterPanel
      expect(screen.getByText('Pet type')).toBeInTheDocument()
      expect(screen.getByText('Relationship')).toBeInTheDocument()
    })

    it('filters by pet type', async () => {
      setMockSections({
        owned: [
          createMockPet(1, 'Alice', 'active', mockCatType),
          createMockPet(2, 'Bob', 'active', mockDogType),
        ],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      })

      renderAuthenticatedPage()

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Filters'))

      // Click on 'Dog' chip
      const dogChip = screen.getByRole('button', { name: 'Dog' })
      fireEvent.click(dogChip)

      await waitFor(() => {
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
      })
    })

    it('filters by relationship', async () => {
      const fosterPet = createMockPet(3, 'FosterPet', 'active', mockCatType)
      setMockSections({
        owned: [createMockPet(1, 'Owner Pet', 'active', mockCatType)],
        fostering_active: [fosterPet],
        fostering_past: [],
        transferred_away: [],
      })

      renderAuthenticatedPage()

      await waitFor(() => {
        expect(screen.getByText('Owner Pet')).toBeInTheDocument()
        expect(screen.getByText('FosterPet')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Filters'))

      // Click on 'Owner' relationship chip
      const ownerChip = screen.getByRole('button', { name: 'Owner' })
      fireEvent.click(ownerChip)

      await waitFor(() => {
        expect(screen.getByText('Owner Pet')).toBeInTheDocument()
        expect(screen.queryByText('FosterPet')).not.toBeInTheDocument()
        expect(screen.queryByText('Fostering (Active)')).not.toBeInTheDocument()
      })
    })

    it('resets filters', async () => {
      setMockSections({
        owned: [
          createMockPet(1, 'Alice', 'active', mockCatType),
          createMockPet(2, 'Bob', 'active', mockDogType),
        ],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      })

      renderAuthenticatedPage()

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Filters'))
      fireEvent.click(screen.getByRole('button', { name: 'Dog' }))

      await waitFor(() => {
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
      })

      const resetButton = screen.getByRole('button', { name: 'Reset' })
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
      })
    })

    it('shows "No results" when everything is filtered out', async () => {
      setMockSections({
        owned: [
          createMockPet(1, 'Cat Pet', 'active', mockCatType),
          createMockPet(2, 'Dog Pet', 'active', mockDogType),
        ],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      })

      renderAuthenticatedPage()

      await waitFor(() => {
        expect(screen.getByText('Cat Pet')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText('Filters'))
      // First click Cat to filter down to Cats only (Alice) - wait, my logic is multi-select.
      // If I click 'Dog', and both exist, then both are shown if nothing else is clicked?
      // No, if no petTypeIds are selected, ALL are shown.
      // If I click 'Dog', then ONLY Dogs are shown.

      fireEvent.click(screen.getByRole('button', { name: 'Dog' }))

      await waitFor(() => {
        expect(screen.queryByText('Cat Pet')).not.toBeInTheDocument()
        expect(screen.getByText('Dog Pet')).toBeInTheDocument()
      })

      // Now click on relationship 'Foster' which none have
      fireEvent.click(screen.getByRole('button', { name: 'Foster' }))

      await waitFor(() => {
        expect(screen.queryByText('Dog Pet')).not.toBeInTheDocument()
        expect(screen.getByText('No pets match your filter.')).toBeInTheDocument()
      })
    })
  })
})
