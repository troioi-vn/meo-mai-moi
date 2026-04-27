import { screen, fireEvent } from '@testing-library/react'
import { renderWithRouter, testQueryClient } from '@/testing'
import { PetCard } from './PetCard'
import type { Pet, PetType } from '@/types/pet'
import { beforeEach, vi } from 'vite-plus/test'

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
  placement_requests_allowed: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockCat: Pet = {
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
  pet_type: mockCatType,
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  placement_requests: [
    {
      id: 1,
      pet_id: 1,
      user_id: 1,
      request_type: 'adoption',
      status: 'open',
    },
  ],
}

const mockDog: Pet = {
  id: 2,
  name: 'Buddy',
  birthday: '2021-01-01',
  country: 'VN',
  state: '',
  city: 'Ho Chi Minh City',
  address: '',
  description: 'A friendly dog',
  user_id: 1,
  pet_type_id: 2,
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  pet_type: mockDogType,
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  },
  placement_requests: [
    {
      id: 2,
      pet_id: 2,
      user_id: 1,
      request_type: 'adoption',
      status: 'open',
    },
  ],
}

const mockUser = {
  id: 2,
  name: 'Jane Doe',
  email: 'jane@example.com',
}

describe('PetCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    testQueryClient.clear()
  })

  it('renders cat information correctly', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    // Age formatting is tested in formatPetAge tests - just check card renders
    expect(screen.getByText('ADOPTION')).toBeInTheDocument()
  })

  it('renders dog information correctly', () => {
    renderWithRouter(<PetCard pet={mockDog} />)

    expect(screen.getByText('Buddy')).toBeInTheDocument()
    // Age formatting is tested in formatPetAge tests
  })

  it('shows respond button for cats with active placement requests when user is authenticated', () => {
    renderWithRouter(<PetCard pet={mockCat} />, {
      initialAuthState: { user: mockUser as any, isLoading: false, isAuthenticated: true },
    })

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows respond button when user is not authenticated', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows login prompt modal when non-authenticated user clicks respond', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    const respondButton = screen.getByRole('button')
    fireEvent.click(respondButton)

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="alert-dialog-title"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="alert-dialog-description"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="alert-dialog-action"]')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="alert-dialog-cancel"]')).toBeInTheDocument()
  })

  it('navigates to placement request when respond button is clicked', () => {
    renderWithRouter(<PetCard pet={mockCat} />, {
      initialAuthState: { user: mockUser as any, isLoading: false, isAuthenticated: true },
    })

    const respondButton = screen.getByRole('button')
    fireEvent.click(respondButton)

    expect(mockNavigate).toHaveBeenCalledWith('/requests/1')
  })

  it('does not show respond button for owners', () => {
    const ownerUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    }
    renderWithRouter(<PetCard pet={mockCat} />, {
      initialAuthState: { user: ownerUser as any, isLoading: false, isAuthenticated: true },
    })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders pet name and photo as links to the pet profile', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    // Both the name text and the photo should link to the pet profile
    const profileLinks = screen.getAllByRole('link', { name: 'Fluffy' })
    expect(profileLinks.length).toBeGreaterThanOrEqual(2)
    profileLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/pets/1')
    })
  })

  it('shows fulfilled status when placement request is fulfilled', () => {
    const fulfilledCat = {
      ...mockCat,
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

    renderWithRouter(<PetCard pet={fulfilledCat} />)

    expect(screen.getByText('Fulfilled')).toBeInTheDocument()
  })

  it('shows lost status badge when pet status is lost', () => {
    const lostCat = {
      ...mockCat,
      status: 'lost' as const,
    }

    renderWithRouter(<PetCard pet={lostCat} />)

    expect(screen.getByText('Lost')).toBeInTheDocument()
  })

  it('routes edit icon to pet profile inline edit mode on General tab', () => {
    const editablePet: Pet = {
      ...mockCat,
      viewer_permissions: {
        can_edit: true,
      },
    }

    renderWithRouter(<PetCard pet={editablePet} />, {
      initialAuthState: { user: mockUser as any, isLoading: false, isAuthenticated: true },
    })

    const editLink = screen.getByRole('link', { name: 'Edit Profile' })
    expect(editLink).toHaveAttribute('href', '/pets/1?edit=general')
  })

  it('shows edit icon when API returns created_by without user_id', () => {
    const apiShapePet = {
      ...mockCat,
      user_id: undefined,
      created_by: 2,
      viewer_permissions: undefined,
    } as unknown as Pet

    renderWithRouter(<PetCard pet={apiShapePet} />, {
      initialAuthState: { user: mockUser as any, isLoading: false, isAuthenticated: true },
    })

    expect(screen.getByRole('link', { name: 'Edit Profile' })).toHaveAttribute(
      'href',
      '/pets/1?edit=general'
    )
  })

  it('renders preloaded health summary without per-card fetching', () => {
    const petWithHealthSummary: Pet = {
      ...mockCat,
      pet_type: {
        ...mockCatType,
        weight_tracking_allowed: true,
      },
      health_summary: {
        latest_weight_kg: 4.8,
        latest_weight_record_date: '2026-04-01',
        previous_weight_kg: 4.5,
        previous_weight_record_date: '2026-03-01',
        vaccination_status: 'due_soon',
      },
    }

    renderWithRouter(<PetCard pet={petWithHealthSummary} showPrivateHealthSummary />)

    expect(screen.getByText('4.8 kg')).toBeInTheDocument()
    expect(screen.getByText('Due soon')).toBeInTheDocument()
  })
})
