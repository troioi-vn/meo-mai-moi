import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { renderWithRouter } from '@/testing'
import MyPetsPage from './MyPetsPage'
import type { Pet, PetType } from '@/types/pet'

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

vi.mock('@/api/generated/pets/pets', async () => {
  const actual = await vi.importActual<typeof import('@/api/generated/pets/pets')>(
    '@/api/generated/pets/pets'
  )
  return {
    ...actual,
    getGetMyPetsSectionsQueryKey: () => ['/my-pets/sections'] as const,
    getGetMyPetsQueryKey: () => ['/my-pets'] as const,
    getGetPetsFeaturedQueryKey: () => ['/pets/featured'] as const,
    useGetMyPetsSections: () => ({
      data: mockSectionsData,
      isLoading: mockSectionsLoading,
      isError: mockSectionsError !== null,
    }),
  }
})

vi.mock('@/hooks/useVaccinations', () => ({
  useVaccinations: () => ({ items: [], loading: false }),
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
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
  petType: PetType = mockCatType,
  overrides: Partial<Pet> = {}
): Pet =>
  ({
    id,
    name,
    birthday: '2020-01-01',
    country: 'VN',
    city: 'Test Location',
    description: 'Test Description',
    user_id: 1,
    pet_type_id: petType.id,
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    pet_type: petType,
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
    ...overrides,
  }) as unknown as Pet

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' }
const renderAuthenticatedPage = () =>
  renderWithRouter(<MyPetsPage />, {
    initialAuthState: { user: mockUser, isLoading: false, isAuthenticated: true },
  })

describe('MyPetsPage litter collapsing', () => {
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

  it('collapses litter members into one card per litter per section', async () => {
    const litterPets = [
      createMockPet(1, 'Kitten A', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Spring Litter' },
      }),
      createMockPet(2, 'Kitten B', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Spring Litter' },
      }),
      createMockPet(3, 'Kitten C', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Spring Litter' },
      }),
      createMockPet(4, 'Solo', mockCatType, {}),
    ]
    setMockSections({ owned: litterPets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-10')).toBeInTheDocument()
    })
    expect(screen.getByText('Spring Litter')).toBeInTheDocument()
    expect(screen.getByText('3 members')).toBeInTheDocument()
    // Solo pet still renders as pet card
    expect(screen.getByTestId('pet-card-root-4')).toBeInTheDocument()
    // Litter members should NOT have individual pet cards
    expect(screen.queryByTestId('pet-card-root-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pet-card-root-2')).not.toBeInTheDocument()
  })

  it('shows litter card per section counting only that section members', async () => {
    const litterOwned = [
      createMockPet(1, 'A', mockCatType, { litter_id: 10, litter: { id: 10, name: 'Litter X' } }),
      createMockPet(2, 'B', mockCatType, { litter_id: 10, litter: { id: 10, name: 'Litter X' } }),
    ]
    const litterFostering = [
      createMockPet(3, 'C', mockCatType, { litter_id: 10, litter: { id: 10, name: 'Litter X' } }),
    ]
    setMockSections({
      owned: litterOwned,
      fostering_active: litterFostering,
      shared: [],
      fostering_past: [],
    })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getAllByTestId('litter-card-10')).toHaveLength(2)
    })
    // Each section has its own count
    const cards = screen.getAllByTestId('litter-card-10')
    // First card in owned section should show 2 members, second in fostering shows 1
    expect(cards[0]!.textContent).toContain('2 members')
    expect(cards[1]!.textContent).toContain('1 members')
  })

  it('filters members and counts only visible', async () => {
    const pets = [
      createMockPet(1, 'Kitten A', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Filter Litter' },
      }),
      createMockPet(2, 'Kitten B', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Filter Litter' },
      }),
      createMockPet(3, 'Kitten C', mockDogType, {
        litter_id: 10,
        litter: { id: 10, name: 'Filter Litter' },
      }),
    ]
    setMockSections({ owned: pets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-10')).toBeInTheDocument()
    })
    expect(screen.getByText('3 members')).toBeInTheDocument()
    // Open filter and select Dog -> only Dog visible, count should be 1 (visible members only)
    const filterButton = await screen.findByRole('button', { name: 'Filters' })
    fireEvent.click(filterButton)
    const dogChip = screen.getByRole('button', { name: 'Dog' })
    fireEvent.click(dogChip)
    await waitFor(() => {
      expect(screen.getByText('1 members')).toBeInTheDocument()
    })
    expect(screen.queryByText('3 members')).not.toBeInTheDocument()
  })

  it('hides litter card when no members visible after filter', async () => {
    const pets = [
      createMockPet(1, 'Cat A', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Hide Litter' },
      }),
      createMockPet(2, 'Cat B', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Hide Litter' },
      }),
      createMockPet(3, 'Solo Dog', mockDogType, {}),
    ]
    setMockSections({ owned: pets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-10')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-root-3')).toBeInTheDocument()
    })
    const filterButton = await screen.findByRole('button', { name: 'Filters' })
    fireEvent.click(filterButton)
    // Select Dog -> only Solo Dog visible, litter should disappear
    const dogChip = screen.getByRole('button', { name: 'Dog' })
    fireEvent.click(dogChip)
    await waitFor(() => {
      expect(screen.queryByTestId('litter-card-10')).not.toBeInTheDocument()
      expect(screen.getByTestId('pet-card-root-3')).toBeInTheDocument()
    })
  })

  it('exempts selection mode: shows individual litter members with checkboxes', async () => {
    const mixed = [
      createMockPet(10, 'SoloSelect', mockCatType, { viewer_permissions: { is_owner: true } }),
      createMockPet(1, 'A', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Select Litter' },
        viewer_permissions: { is_owner: true },
      }),
      createMockPet(2, 'B', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Select Litter' },
        viewer_permissions: { is_owner: true },
      }),
    ]
    setMockSections({ owned: mixed, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-10')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-root-10')).toBeInTheDocument()
    })
    const soloCard = screen.getByTestId('pet-card-root-10')
    fireEvent.pointerDown(soloCard)
    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument()
    })
    // Now litter should be expanded to individual pet cards
    expect(screen.queryByTestId('litter-card-10')).not.toBeInTheDocument()
    expect(screen.queryByTestId('litter-card-compact-10')).not.toBeInTheDocument()
    expect(screen.getByTestId('pet-card-compact-1')).toBeInTheDocument()
    expect(screen.getByTestId('pet-card-compact-2')).toBeInTheDocument()
  })

  it('clicking litter card navigates to detail page', async () => {
    const pets = [
      createMockPet(1, 'A', mockCatType, { litter_id: 10, litter: { id: 10, name: 'Nav Litter' } }),
      createMockPet(2, 'B', mockCatType, { litter_id: 10, litter: { id: 10, name: 'Nav Litter' } }),
    ]
    setMockSections({ owned: pets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-link-10')).toBeInTheDocument()
    })
    expect(screen.getByTestId('litter-card-link-10')).toHaveAttribute('href', '/litters/10')
  })

  it('compact view uses LitterCardCompact', async () => {
    localStorage.setItem('my-pets-view', 'compact')
    const pets = [
      createMockPet(1, 'A', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Compact Litter' },
      }),
      createMockPet(2, 'B', mockCatType, {
        litter_id: 10,
        litter: { id: 10, name: 'Compact Litter' },
      }),
    ]
    setMockSections({ owned: pets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('litter-card-compact-10')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('litter-card-10')).not.toBeInTheDocument()
  })

  it('pets without litter are unaffected', async () => {
    const pets = [
      createMockPet(1, 'Solo1', mockCatType, {}),
      createMockPet(2, 'Solo2', mockCatType, {}),
    ]
    setMockSections({ owned: pets, fostering_active: [], shared: [], fostering_past: [] })
    renderAuthenticatedPage()
    await waitFor(() => {
      expect(screen.getByTestId('pet-card-root-1')).toBeInTheDocument()
      expect(screen.getByTestId('pet-card-root-2')).toBeInTheDocument()
    })
    expect(screen.queryByTestId(/litter-card/)).not.toBeInTheDocument()
  })
})
