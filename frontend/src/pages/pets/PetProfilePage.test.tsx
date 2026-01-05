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

vi.mock('@/components/placement/pet-profile/PlacementRequestsSection', () => ({
  PlacementRequestsSection: () => <div data-testid="placement-requests-section" />,
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

vi.mock('@/components/placement/PlacementRequestModal', () => ({
  PlacementRequestModal: ({ onSuccess }: { onSuccess?: () => void }) => (
    <button
      type="button"
      data-testid="mock-create-request"
      onClick={() => {
        onSuccess?.()
      }}
    >
      Mock Create Request
    </button>
  ),
}))

describe('PetProfilePage placement request flow', () => {
  it('redirects to requests page after creating a placement request', async () => {
    const { user } = renderWithRouter(<PetProfilePage />, {
      initialEntries: ['/pets/1'],
      routes: [{ path: '/requests', element: <div>Requests Page</div> }],
    })

    await user.click(await screen.findByTestId('mock-create-request'))

    await waitFor(() => {
      expect(screen.getByText('Requests Page')).toBeInTheDocument()
    })
    expect(refreshMock).toHaveBeenCalled()
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
      expect(screen.getByText('Owner Pet')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('public-view')).not.toBeInTheDocument()
  })
})
