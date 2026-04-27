import { screen, fireEvent } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { PetCardCompact } from './PetCardCompact'
import type { Pet, PetType } from '@/types/pet'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useVaccinations } from '@/hooks/useVaccinations'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useVaccinations to avoid API calls and facilitate testing status badges
vi.mock('@/hooks/useVaccinations', () => ({
  useVaccinations: vi.fn(),
}))

const mockPetType: PetType = {
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

const mockPet: Pet = {
  id: 1,
  name: 'Fluffy',
  birthday: '2020-01-01',
  country: 'VN',
  state: '',
  city: 'Hanoi',
  address: '',
  description: 'A lovely cat',
  user_id: 1,
  pet_type_id: 1,
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  pet_type: mockPetType,
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  placement_requests: [],
}

describe('PetCardCompact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useVaccinations as any).mockReturnValue({
      items: [],
      loading: false,
      error: null,
    })
  })

  it('renders pet information correctly', () => {
    renderWithRouter(<PetCardCompact pet={mockPet} />)

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    // Age formatting is tested in formatPetAge tests
  })

  it('navigates to pet profile when clicked', () => {
    renderWithRouter(<PetCardCompact pet={mockPet} />)

    const card = screen.getByText('Fluffy').closest('div')?.parentElement
    expect(card).toBeInTheDocument()

    // The clickable element is the outermost div
    fireEvent.click(card!)

    expect(mockNavigate).toHaveBeenCalledWith('/pets/1')
  })

  it('shows lost status badge when pet status is lost', () => {
    const lostPet = {
      ...mockPet,
      status: 'lost' as const,
    }

    renderWithRouter(<PetCardCompact pet={lostPet} />)

    expect(screen.getByText('Lost')).toBeInTheDocument()
  })

  it('shows fulfilled badge when pet has fulfilled placement requests', () => {
    const fulfilledPet = {
      ...mockPet,
      placement_requests: [
        {
          id: 1,
          pet_id: 1,
          user_id: 1,
          request_type: 'adoption',
          status: 'fulfilled',
        },
      ],
    }

    renderWithRouter(<PetCardCompact pet={fulfilledPet} />)

    expect(screen.getByText('Fulfilled')).toBeInTheDocument()
  })

  it('applies grayscale to image when pet is deceased', () => {
    const deceasedPet = {
      ...mockPet,
      status: 'deceased' as const,
    }

    const { container } = renderWithRouter(<PetCardCompact pet={deceasedPet} />)

    const img = container.querySelector('img')
    expect(img).toHaveClass('grayscale')
  })

  it('renders male icon for male pet', () => {
    const malePet = {
      ...mockPet,
      sex: 'male' as const,
    }

    const { container } = renderWithRouter(<PetCardCompact pet={malePet} />)

    // Check for Mars icon (lucide-react)
    const icon = container.querySelector('svg.text-blue-500')
    expect(icon).toBeInTheDocument()
  })

  it('renders female icon for female pet', () => {
    const femalePet = {
      ...mockPet,
      sex: 'female' as const,
    }

    const { container } = renderWithRouter(<PetCardCompact pet={femalePet} />)

    // Check for Venus icon (lucide-react)
    const icon = container.querySelector('svg.text-pink-500')
    expect(icon).toBeInTheDocument()
  })

  it('renders vaccination status when supported', () => {
    // Pet type with vaccinations capability
    const typeWithVaccinations = {
      ...mockPetType,
      slug: 'cat', // Assuming cat supports it
    }

    const petWithVaccinations = {
      ...mockPet,
      pet_type: typeWithVaccinations,
    }

    // Mock vaccination items to show "Up to date"
    ;(useVaccinations as any).mockReturnValue({
      items: [
        {
          id: 1,
          vaccine_name: 'Rabies',
          administered_at: '2023-01-01',
          due_at: '2029-01-01', // Far future to be "Up to date"
        },
      ],
      loading: false,
    })

    renderWithRouter(<PetCardCompact pet={petWithVaccinations} />)

    // The VaccinationStatusBadge should render based on the mock items
    // "Up to date" is the translated text for status 'up_to_date'
    expect(screen.getByText('Up to date')).toBeInTheDocument()
  })

  it('does not render vaccination status when not supported', () => {
    // Pet type WITHOUT vaccinations capability (e.g. slug: 'dog' - currently only cat supported in helper)
    const typeWithoutVaccinations = {
      ...mockPetType,
      slug: 'dog',
    }

    const petWithoutVaccinations = {
      ...mockPet,
      pet_type: typeWithoutVaccinations,
    }

    // Even if there are items, it shouldn't render if pet_type doesn't support it
    ;(useVaccinations as any).mockReturnValue({
      items: [
        {
          id: 1,
          vaccine_name: 'Rabies',
          administered_at: '2023-01-01',
          due_at: '2029-01-01',
        },
      ],
      loading: false,
    })

    renderWithRouter(<PetCardCompact pet={petWithoutVaccinations} />)

    expect(screen.queryByText('Up to date')).not.toBeInTheDocument()
  })
})
