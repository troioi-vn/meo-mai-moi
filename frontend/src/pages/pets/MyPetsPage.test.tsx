import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { renderWithRouter } from '@/testing'
import MyPetsPage from './MyPetsPage'
import type { Pet, PetType } from '@/types/pet'

// Mutable state for the hook mock
let mockSectionsData:
  | {
      owned: Pet[]
      fostering_active: Pet[]
      shared: Pet[]
      fostering_past: Pet[]
    }
  | undefined = undefined
let mockSectionsLoading = true
let mockSectionsError: Error | null = null
let mockIsOnline = true
let mockGroups: {
  id: number
  name: string
  viewer_role: 'admin' | 'member' | null
  member_count: number
  pet_count: number
}[] = []

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

vi.mock('@/api/groups', async () => {
  const actual = await vi.importActual<typeof import('@/api/groups')>('@/api/groups')
  return {
    ...actual,
    useGroups: () => ({
      data: mockGroups,
      isLoading: false,
      isError: false,
    }),
    useMyPetsSections: () => ({
      data: mockSectionsData,
      isLoading: mockSectionsLoading,
      isError: mockSectionsError !== null,
    }),
    useCreateGroup: () => ({
      mutateAsync: vi.fn(async (body: { name: string; pet_ids?: number[] }) => ({
        id: 99,
        name: body.name,
        created_by_user_id: 1,
        viewer_role: 'admin',
        member_count: 1,
        pet_count: body.pet_ids?.length ?? 0,
        pets: [],
        members: [],
      })),
      isPending: false,
    }),
  }
})

vi.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => mockIsOnline,
}))

// Mock the PetCard component
vi.mock('@/components/pets/PetCard', () => ({
  PetCard: ({
    pet,
    selectionMode,
    selected,
    selectable,
    onToggleSelect,
    onLongPressEnterSelection,
  }: {
    pet: Pet
    selectionMode?: boolean
    selected?: boolean
    selectable?: boolean
    onToggleSelect?: () => void
    onLongPressEnterSelection?: () => void
  }) => (
    <div
      data-testid={`pet-card-${String(pet.id)}`}
      data-selected={selected ? 'true' : 'false'}
      data-selectable={selectable ? 'true' : 'false'}
      onPointerDown={onLongPressEnterSelection}
    >
      <h3>{pet.name}</h3>
      <span>{pet.pet_type?.name ?? 'Unknown'}</span>
      {selectionMode && selectable && (
        <button type="button" onClick={onToggleSelect} data-testid={`toggle-pet-${String(pet.id)}`}>
          toggle
        </button>
      )}
    </div>
  ),
}))

// Mock the PetCardCompact component
vi.mock('@/components/pets/PetCardCompact', () => ({
  PetCardCompact: ({
    pet,
    selectionMode,
    selected,
    selectable,
    onToggleSelect,
    onLongPressEnterSelection,
  }: {
    pet: Pet
    selectionMode?: boolean
    selected?: boolean
    selectable?: boolean
    onToggleSelect?: () => void
    onLongPressEnterSelection?: () => void
  }) => (
    <div
      data-testid={`pet-card-compact-${String(pet.id)}`}
      data-selected={selected ? 'true' : 'false'}
      data-selectable={selectable ? 'true' : 'false'}
      onPointerDown={onLongPressEnterSelection}
    >
      <h3>{pet.name}</h3>
      <span>{pet.pet_type?.name ?? 'Unknown'}</span>
      {selectionMode && selectable && (
        <button
          type="button"
          onClick={onToggleSelect}
          data-testid={`toggle-compact-pet-${String(pet.id)}`}
        >
          toggle
        </button>
      )}
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

const getCreatePetButton = (): HTMLButtonElement => {
  const button = document.querySelector('button[data-variant="default"]')
  if (!(button instanceof HTMLButtonElement)) throw new Error('Create pet button not found')
  return button
}

describe('MyPetsPage', () => {
  /** Helper to set mock data for a "loaded" state */
  const setMockSections = (sections: {
    owned: Pet[]
    fostering_active: Pet[]
    shared: Pet[]
    fostering_past: Pet[]
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
    mockGroups = []
  })

  it('does not show group context selector when user has no groups', async () => {
    setMockSections({
      owned: [createMockPet(1, 'Fluffy', 'active', mockCatType)],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })
    mockGroups = []

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('group-context-selector')).not.toBeInTheDocument()
    expect(screen.getByTestId('create-group-unobtrusive')).toBeInTheDocument()
  })

  it('shows group context selector when user has groups', async () => {
    setMockSections({
      owned: [createMockPet(1, 'Fluffy', 'active', mockCatType)],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })
    mockGroups = [
      {
        id: 7,
        name: 'Catarchy Rescue',
        viewer_role: 'admin',
        member_count: 2,
        pet_count: 1,
      },
    ]
    localStorage.setItem('my-pets-group-context', '7')

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('group-context-selector')).toBeInTheDocument()
    })
    expect(screen.queryByText('Manage groups')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/groups/7/settings'
    )
    expect(screen.queryByTestId('create-group-unobtrusive')).not.toBeInTheDocument()
  })

  it('falls back to All pets and disables group switching when offline', async () => {
    mockIsOnline = false
    mockGroups = [
      {
        id: 7,
        name: 'Catarchy Rescue',
        viewer_role: 'admin',
        member_count: 2,
        pet_count: 1,
      },
    ]
    setMockSections({
      owned: [createMockPet(1, 'Fluffy', 'active', mockCatType)],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })
    localStorage.setItem('my-pets-group-context', '7')

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })
    const selector = screen.getByTestId('group-context-selector')
    expect(selector).toBeDisabled()
    expect(selector).toHaveTextContent('All pets')
    expect(screen.queryByTestId('enter-selection')).not.toBeInTheDocument()
  })

  it('enters selection mode and opens create-group dialog', async () => {
    const owned = createMockPet(1, 'Fluffy', 'active', mockCatType)
    owned.viewer_permissions = { is_owner: true, can_edit: true }
    setMockSections({
      owned: [owned],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })

    fireEvent.pointerDown(screen.getByTestId('pet-card-1'))

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('toggle-pet-1'))
    fireEvent.click(screen.getByTestId('create-group-from-selection'))

    await waitFor(() => {
      expect(screen.getByTestId('create-group-name')).toBeInTheDocument()
    })
  })

  it('preserves selection controls in compact view', async () => {
    localStorage.setItem('my-pets-view', 'compact')
    const owned = createMockPet(1, 'Fluffy', 'active', mockCatType)
    owned.viewer_permissions = { is_owner: true, can_edit: true }
    setMockSections({
      owned: [owned],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-compact-1')).toBeInTheDocument()
    })

    fireEvent.pointerDown(screen.getByTestId('pet-card-compact-1'))

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('toggle-compact-pet-1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('toggle-compact-pet-1'))
    fireEvent.click(screen.getByTestId('create-group-from-selection'))

    await waitFor(() => {
      expect(screen.getByTestId('create-group-name')).toBeInTheDocument()
    })
  })

  it('switches an empty Group to All pets before entering selection', async () => {
    localStorage.setItem('my-pets-group-context', '7')
    mockGroups = [
      {
        id: 7,
        name: 'Empty Rescue',
        viewer_role: 'admin',
        member_count: 1,
        pet_count: 0,
      },
    ]
    setMockSections({
      owned: [],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })

    renderAuthenticatedPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Add pets' }))

    await waitFor(() => {
      expect(localStorage.getItem('my-pets-group-context')).toBe('all')
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument()
    })
  })

  it('renders page title and new pet button', async () => {
    const ownedPets = [createMockPet(1, 'Fluffy', 'active', mockCatType)]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: pastFostering,
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2)
      expect(screen.getByTestId('pet-card-3')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-4')).toBeInTheDocument()
    })
  })

  it('renders shared section', async () => {
    const sharedPet = createMockPet(5, 'Shared Cat', 'active')
    sharedPet.viewer_permissions = {
      can_edit: true,
      is_owner: false,
      is_editor: true,
      is_viewer: false,
    }

    setMockSections({
      owned: [],
      fostering_active: [],
      shared: [sharedPet],
      fostering_past: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /shared with me/i })).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-5')).toBeInTheDocument()
      expect(screen.getByText('Shared Cat')).toBeInTheDocument()
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
    })

    renderWithRouter(<MyPetsPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByText('Offline Fluffy')).toBeInTheDocument()
      expect(screen.queryByText('Please log in to view your pets.')).not.toBeInTheDocument()
    })

    expect(getCreatePetButton()).toBeInTheDocument()
  })

  it('renders cached pets and create button offline when cached auth is available', async () => {
    mockIsOnline = false
    setMockSections({
      owned: [createMockPet(1, 'Offline Fluffy', 'active', mockCatType)],
      fostering_active: [],
      shared: [],
      fostering_past: [],
    })

    renderAuthenticatedPage()

    await waitFor(() => {
      expect(screen.getByText('Offline Fluffy')).toBeInTheDocument()
      expect(getCreatePetButton()).toBeInTheDocument()
    })
  })

  it('displays show all toggle with correct label', async () => {
    const ownedPets = [
      createMockPet(1, 'Active Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    setMockSections({
      owned: ownedPets,
      fostering_active: [],
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
      shared: [],
      fostering_past: [],
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
        shared: [],
        fostering_past: [],
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
        shared: [],
        fostering_past: [],
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
        shared: [],
        fostering_past: [],
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
        shared: [],
        fostering_past: [],
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
        shared: [],
        fostering_past: [],
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
