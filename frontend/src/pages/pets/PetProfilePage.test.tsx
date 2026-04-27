import { renderWithRouter, screen, waitFor } from '@/testing'
import PetProfilePage from './PetProfilePage'
import { vi, describe, it, expect, beforeEach } from 'vite-plus/test'
import { mockPet } from '@/testing/mocks/data/pets'
import type { Pet, PetType, PlacementRequest } from '@/types/pet'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  }
})

const createPlacementRequest = (id: number): PlacementRequest => ({
  id,
  pet_id: 1,
  request_type: 'permanent',
  status: 'open',
  created_at: '2026-01-01T00:00:00.000Z',
})

const createDogPetType = (): PetType => ({
  id: mockPet.pet_type?.id ?? 1,
  name: mockPet.pet_type?.name ?? 'Dog',
  slug: 'dog',
  description: mockPet.pet_type?.description ?? '',
  is_active: mockPet.pet_type?.is_active ?? true,
  is_system: mockPet.pet_type?.is_system ?? true,
  display_order: mockPet.pet_type?.display_order ?? 1,
  placement_requests_allowed: true,
  weight_tracking_allowed: false,
  microchips_allowed: false,
  created_at: mockPet.pet_type?.created_at,
  updated_at: mockPet.pet_type?.updated_at,
})

let mockPetData: Pet = {
  ...mockPet,
  pet_type: createDogPetType(),
  viewer_permissions: { can_edit: true, is_owner: true },
  placement_requests: [],
  status: 'active',
}

vi.mock('@/api/generated/pets/pets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/generated/pets/pets')>()
  return {
    ...actual,
    useGetPetsId: () => ({
      data: mockPetData,
      isLoading: false,
      error: null,
    }),
    getGetPetsIdQueryKey: (id: number) => [`/pets/${id}`],
    usePutPetsIdStatus: () => ({ mutateAsync: vi.fn() }),
    useDeletePetsId: () => ({ mutateAsync: vi.fn() }),
    usePostPets: () => ({ mutateAsync: vi.fn() }),
    usePutPetsId: () => ({ mutateAsync: vi.fn() }),
    useGetPetTypes: () => ({ data: [], isLoading: false }),
    getGetMyPetsSectionsQueryKey: () => ['/my/pets/sections'],
  }
})

vi.mock('@/components/pet-health/weights/WeightHistoryCard', () => ({
  WeightHistoryCard: () => <div data-testid="weight-history-card" />,
}))

vi.mock('@/components/pet-health/vaccinations/UpcomingVaccinationsSection', () => ({
  UpcomingVaccinationsSection: () => <div data-testid="vaccinations-section" />,
}))

vi.mock('@/components/pet-health/medical/MedicalRecordsSection', () => ({
  MedicalRecordsSection: () => <div data-testid="medical-records-section" />,
}))

vi.mock('@/components/pet-health/vaccinations/VaccinationStatusBadge', () => ({
  VaccinationStatusBadge: () => <div data-testid="vaccination-status-badge" />,
}))

describe('PetProfilePage placement requests list', () => {
  beforeEach(() => {
    mockPetData = {
      ...mockPet,
      pet_type: createDogPetType(),
      viewer_permissions: { can_edit: true, is_owner: true },
      placement_requests: [],
      status: 'active',
    }
  })

  it('shows empty state when there are no placement requests', () => {
    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
    })

    expect(screen.getByText('Placement Requests')).toBeInTheDocument()
    expect(screen.getByText('No placement requests yet.')).toBeInTheDocument()
  })

  it('renders a clickable list item for each placement request', () => {
    mockPetData.placement_requests = [createPlacementRequest(123)]

    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
      routes: [{ path: '/requests/:id', element: <div>Request Detail</div> }],
    })

    const link = screen.getByRole('link', { name: /open placement request 123/i })
    expect(link).toHaveAttribute('href', '/requests/123')
  })
})

describe('PetProfilePage redirect logic', () => {
  beforeEach(() => {
    // Reset to default owner state
    mockPetData = {
      ...mockPet,
      pet_type: createDogPetType(),
      viewer_permissions: { can_edit: true, is_owner: true },
      placement_requests: [],
      status: 'active',
    }
  })

  it('redirects to public view if user is a viewer', async () => {
    mockPetData.viewer_permissions = {
      can_edit: false,
      is_owner: false,
      is_viewer: true,
    }

    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
      routes: [
        { path: '/pets/:id/view', element: <div data-testid="public-view">Public View Page</div> },
      ],
    })

    await waitFor(() => {
      expect(screen.getByTestId('public-view')).toBeInTheDocument()
    })
  })

  it('redirects to public view if pet has active placement request and user is not owner', async () => {
    mockPetData.viewer_permissions = {
      can_edit: false,
      is_owner: false,
      is_viewer: false,
    }
    mockPetData.placement_requests = [createPlacementRequest(1)]

    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
      routes: [
        { path: '/pets/:id/view', element: <div data-testid="public-view">Public View Page</div> },
      ],
    })

    await waitFor(() => {
      expect(screen.getByTestId('public-view')).toBeInTheDocument()
    })
  })

  it('does NOT redirect if user is owner even with active placement request', async () => {
    mockPetData.name = 'Owner Pet'
    mockPetData.viewer_permissions = {
      can_edit: true,
      is_owner: true,
      is_viewer: false,
    }
    mockPetData.placement_requests = [createPlacementRequest(1)]

    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
      routes: [
        { path: '/pets/:id/view', element: <div data-testid="public-view">Public View Page</div> },
      ],
    })

    // Should show the pet name, not redirect
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Owner Pet', level: 1 })).toBeInTheDocument()
    })
    expect(screen.queryByTestId('public-view')).not.toBeInTheDocument()
  })
})

describe('PetProfilePage edit query param', () => {
  beforeEach(() => {
    mockPetData = {
      ...mockPet,
      pet_type: createDogPetType(),
      viewer_permissions: { can_edit: true, is_owner: true },
      placement_requests: [],
      status: 'active',
    }
  })

  it('opens inline pet editor on General tab when edit=general is present', async () => {
    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1?edit=general'],
    })

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('data-state', 'active')
    })
    expect(screen.getByRole('button', { name: 'Update Pet' })).toBeInTheDocument()
  })
})

describe('PetProfilePage scroll behavior', () => {
  it('scrolls to top on mount', () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
    })

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
    scrollToSpy.mockRestore()
  })
})
