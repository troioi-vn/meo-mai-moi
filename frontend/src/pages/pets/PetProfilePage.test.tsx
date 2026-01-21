import { renderWithRouter, screen, waitFor } from '@/testing'
import PetProfilePage from './PetProfilePage'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mockPet } from '@/testing/mocks/data/pets'

const refreshMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  }
})

let mockPetData = {
  ...mockPet,
  pet_type: {
    ...mockPet.pet_type,
    slug: 'dog',
    placement_requests_allowed: true,
    weight_tracking_allowed: false,
    microchips_allowed: false,
  },
  viewer_permissions: { can_edit: true },
  placement_requests: [],
  status: 'active',
}

vi.mock('@/hooks/usePetProfile', () => ({
  usePetProfile: () => ({
    pet: mockPetData,
    loading: false,
    error: null,
    refresh: refreshMock,
  }),
}))

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
      pet_type: {
        ...mockPet.pet_type,
        slug: 'dog',
        placement_requests_allowed: true,
      },
      viewer_permissions: { can_edit: true },
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
    mockPetData.placement_requests = [
      {
        id: 123,
        status: 'open',
        request_type: 'permanent',
        created_at: '2026-01-01T00:00:00.000Z',
      } as any,
    ]

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
      pet_type: {
        ...mockPet.pet_type,
        slug: 'dog',
        placement_requests_allowed: true,
      },
      viewer_permissions: { can_edit: true },
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
    mockPetData.placement_requests = [{ id: 1, status: 'open', request_type: 'permanent' } as any]

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
    mockPetData.placement_requests = [{ id: 1, status: 'open', request_type: 'permanent' } as any]

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
