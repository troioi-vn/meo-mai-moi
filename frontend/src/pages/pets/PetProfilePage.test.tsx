import { renderWithRouter, screen, userEvent, waitFor } from '@/testing'
import PetProfilePage from './PetProfilePage'
import { vi } from 'vitest'
import { mockPet } from '@/testing/mocks/data/pets'

const refreshMock = vi.fn()

vi.mock('@/hooks/usePetProfile', () => ({
  usePetProfile: () => ({
    pet: {
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
    },
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

