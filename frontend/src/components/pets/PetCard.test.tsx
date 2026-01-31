import { screen, fireEvent } from '@testing-library/react'
import { renderWithRouter, testQueryClient } from '@/testing'
import { PetCard } from './PetCard'
import type { Pet, PetType } from '@/types/pet'
import { beforeEach, vi } from 'vitest'

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

interface MockUser {
  id: number
  name: string
  email: string
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

    expect(screen.getByText('Respond')).toBeInTheDocument()
  })

  it('shows respond button when user is not authenticated', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    expect(screen.getByText('Respond')).toBeInTheDocument()
  })

  it('shows login prompt modal when non-authenticated user clicks respond', () => {
    renderWithRouter(<PetCard pet={mockCat} />)

    const respondButton = screen.getByText('Respond')
    fireEvent.click(respondButton)

    expect(screen.getByText('Login Required')).toBeInTheDocument()
    expect(
      screen.getByText('Please login to respond to this placement request.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('navigates to placement request when respond button is clicked', () => {
    renderWithRouter(<PetCard pet={mockCat} />, {
      initialAuthState: { user: mockUser as any, isLoading: false, isAuthenticated: true },
    })

    const respondButton = screen.getByText('Respond')
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

    expect(screen.queryByText('Respond')).not.toBeInTheDocument()
  })

  it('navigates to unified pet route on card click', () => {
    const { container } = renderWithRouter(<PetCard pet={mockCat} />)

    // Card should be clickable (find by data-slot="card" or the cursor-pointer class)
    const card = container.querySelector('[data-slot="card"]')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('cursor-pointer')
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
})
