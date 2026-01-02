import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { PetCard } from './PetCard'
import type { Pet, PetType } from '@/types/pet'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

// Mock the PlacementResponseModal
vi.mock('@/components/placement/PlacementResponseModal', () => ({
  PlacementResponseModal: ({ isOpen, petName }: { isOpen: boolean; petName: string }) =>
    isOpen ? <div data-testid="placement-modal">Modal for {petName}</div> : null,
}))

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

const renderWithProviders = (component: React.ReactElement, user: MockUser | null = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={user}>{component}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('PetCard', () => {
  it('renders cat information correctly', () => {
    renderWithProviders(<PetCard pet={mockCat} />)

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    expect(screen.getByText(/\d+ years old/)).toBeInTheDocument()
    expect(screen.getByText('ADOPTION')).toBeInTheDocument()
  })

  it('renders dog information correctly', () => {
    renderWithProviders(<PetCard pet={mockDog} />)

    expect(screen.getByText('Buddy')).toBeInTheDocument()
    expect(screen.getByText(/\d+ years old/)).toBeInTheDocument()
  })

  it('shows respond button for cats with active placement requests when user is authenticated', () => {
    renderWithProviders(<PetCard pet={mockCat} />, mockUser)

    expect(screen.getByText('Respond')).toBeInTheDocument()
  })

  it('shows respond button when user is not authenticated', () => {
    renderWithProviders(<PetCard pet={mockCat} />)

    expect(screen.getByText('Respond')).toBeInTheDocument()
  })

  it('shows login prompt modal when non-authenticated user clicks respond', () => {
    renderWithProviders(<PetCard pet={mockCat} />)

    const respondButton = screen.getByText('Respond')
    fireEvent.click(respondButton)

    expect(screen.getByText('Login Required')).toBeInTheDocument()
    expect(
      screen.getByText('Please login to respond to this placement request.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('opens placement response modal when respond button is clicked', () => {
    renderWithProviders(<PetCard pet={mockCat} />, mockUser)

    const respondButton = screen.getByText('Respond')
    fireEvent.click(respondButton)

    expect(screen.getByTestId('placement-modal')).toBeInTheDocument()
    expect(screen.getByText('Modal for Fluffy')).toBeInTheDocument()
  })

  it('does not show respond button for owners', () => {
    const ownerUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    }
    renderWithProviders(<PetCard pet={mockCat} />, ownerUser)

    expect(screen.queryByText('Respond')).not.toBeInTheDocument()
  })

  it('navigates to unified pet route on card click', () => {
    const { container } = renderWithProviders(<PetCard pet={mockCat} />)

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

    renderWithProviders(<PetCard pet={fulfilledCat} />)

    expect(screen.getByText('Fulfilled')).toBeInTheDocument()
  })

  it('shows lost status badge when pet status is lost', () => {
    const lostCat = {
      ...mockCat,
      status: 'lost' as const,
    }

    renderWithProviders(<PetCard pet={lostCat} />)

    expect(screen.getByText('Lost')).toBeInTheDocument()
  })
})
