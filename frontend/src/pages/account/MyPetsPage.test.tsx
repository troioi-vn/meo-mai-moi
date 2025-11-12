import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import MyPetsPage from './MyPetsPage'
import { getMyPetsSections } from '@/api/pets'
import type { Pet, PetType } from '@/types/pet'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock the API function
vi.mock('@/api/pets', () => ({
  getMyPetsSections: vi.fn() as unknown as MockedFunction<
    () => Promise<{
      owned: Pet[]
      fostering_active: Pet[]
      fostering_past: Pet[]
      transferred_away: Pet[]
    }>
  >,
}))

// Mock the PetCard component
vi.mock('@/components/PetCard', () => ({
  PetCard: ({ pet }: { pet: Pet }) => (
    <div data-testid={`pet-card-${String(pet.id)}`}>
      <h3>{pet.name}</h3>
      <p>{pet.breed}</p>
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
  breed: 'Test Breed',
  birthday: '2020-01-01',
  location: 'Test Location',
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

const renderWithProviders = (
  component: React.ReactElement,
  user: { id: number; name: string; email: string } | null = mockUser
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={user} initialLoading={false} skipInitialLoad={true}>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('MyPetsPage', () => {
  const mockGetMyPetsSections = getMyPetsSections as unknown as MockedFunction<
    () => Promise<{
      owned: Pet[]
      fostering_active: Pet[]
      fostering_past: Pet[]
      transferred_away: Pet[]
    }>
  >

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and new pet button', async () => {
    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    expect(screen.getByText('Pets')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Pet' })).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    mockGetMyPetsSections.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<MyPetsPage />)

    expect(screen.getByText('Loading your pets...')).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    mockGetMyPetsSections.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch your pets. Please try again later.')
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no pets exist', async () => {
    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(
        screen.getByText('No pets yet — add your first pet to get started!')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add Your First Pet' })).toBeInTheDocument()
    })
  })

  it('renders owned pets section', async () => {
    const ownedPets = [
      createMockPet(1, 'Fluffy', 'active', mockCatType),
      createMockPet(2, 'Buddy', 'active', mockDogType),
    ]

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

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

    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: activeFostering,
      fostering_past: pastFostering,
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByText('Fostering (Active)')).toBeInTheDocument()
      expect(screen.getByText('Fostering (Past)')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-3')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-4')).toBeInTheDocument()
    })
  })

  it('renders transferred away section', async () => {
    const transferredAway = [createMockPet(5, 'Transferred Pet', 'active')]

    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: transferredAway,
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByText('Transferred Away')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-5')).toBeInTheDocument()
    })
  })

  it('filters out deceased pets by default', async () => {
    const ownedPets = [
      createMockPet(1, 'Alive Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

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

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

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
    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Pet' })).toBeInTheDocument()
    })

    const newPetButton = screen.getByRole('button', { name: 'New Pet' })
    fireEvent.click(newPetButton)

    expect(mockNavigate).toHaveBeenCalledWith('/account/pets/create')
  })

  it('navigates to create pet page from empty state button', async () => {
    mockGetMyPetsSections.mockResolvedValue({
      owned: [],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Your First Pet' })).toBeInTheDocument()
    })

    const addFirstPetButton = screen.getByRole('button', { name: 'Add Your First Pet' })
    fireEvent.click(addFirstPetButton)

    expect(mockNavigate).toHaveBeenCalledWith('/account/pets/create')
  })

  it('shows unauthenticated message when user is not logged in', () => {
    renderWithProviders(<MyPetsPage />, null)

    expect(screen.getByText('Please log in to view your pets.')).toBeInTheDocument()
  })

  it('displays show all toggle with correct label', async () => {
    const ownedPets = [
      createMockPet(1, 'Active Pet', 'active'),
      createMockPet(2, 'Deceased Pet', 'deceased'),
    ]

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Show all')).toBeInTheDocument()
    })
  })

  it('hides show all toggle when there are no deceased pets', async () => {
    const ownedPets = [createMockPet(1, 'Active Pet', 'active')]

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('pet-card-1')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText('Show all')).not.toBeInTheDocument()
  })

  it('applies proper grid layout to pet sections', async () => {
    const ownedPets = [createMockPet(1, 'Test Pet', 'active')]

    mockGetMyPetsSections.mockResolvedValue({
      owned: ownedPets,
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    renderWithProviders(<MyPetsPage />)

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
})
