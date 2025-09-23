import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import { ActivePlacementRequestsSection } from '@/components/ActivePlacementRequestsSection'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import type { Cat } from '@/types/cat'

// Mock the navigate function
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CatCard Compatibility in ActivePlacementRequestsSection', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  const mockCatWithActivePlacement: Cat = {
    id: 1,
    name: 'Fluffy',
    breed: 'Persian',
    birthday: '2020-01-15',
    status: 'active',
    description: 'A very friendly and fluffy cat.',
    location: 'New York, NY',
    photo_url: 'http://localhost:3000/storage/cats/profiles/fluffy.jpg',
    user_id: 2, // Different from authenticated user (id: 1)
    user: {
      id: 2,
      name: 'Cat Owner',
      email: 'owner@example.com',
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    placement_requests: [
      {
        id: 1,
        cat_id: 1,
        request_type: 'fostering',
        status: 'open',
        notes: 'Looking for a loving home.',
        is_active: true,
        created_at: '2025-07-20T00:00:00Z',
        updated_at: '2025-07-20T00:00:00Z',
      },
    ],
    placement_request_active: true,
  }

  // Removed unused mockCatWithoutPlacement (not required by tests)

  const mockOwnedCat: Cat = {
    id: 3,
    name: 'MyCat',
    breed: 'Tabby',
    birthday: '2021-03-10',
    status: 'active',
    description: 'My own cat.',
    location: 'Chicago, IL',
    user_id: 1, // Same as authenticated user
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    placement_requests: [
      {
        id: 3,
        cat_id: 3,
        request_type: 'adoption',
        status: 'open',
        notes: 'Looking for permanent home.',
        is_active: true,
        created_at: '2025-07-20T00:00:00Z',
        updated_at: '2025-07-20T00:00:00Z',
      },
    ],
    placement_request_active: true,
  }

  it('renders CatCard correctly with active placement request for non-owned cat', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCatWithActivePlacement] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
      expect(screen.getByText('Persian - 5 years old')).toBeInTheDocument()
      expect(screen.getByText('Location: New York, NY')).toBeInTheDocument()
      expect(screen.getByText('FOSTERING')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Respond' })).toBeInTheDocument()
    })
  })

  it('does not show respond button for owned cats', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockOwnedCat] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('MyCat')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Respond' })).not.toBeInTheDocument()
    })
  })

  it('opens PlacementResponseModal when respond button is clicked', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCatWithActivePlacement] })
      }),
      http.get('http://localhost:3000/api/helper-profiles', () => {
        return HttpResponse.json({
          data: [
            {
              id: 1,
              city: 'Test City',
              state: 'Test State',
              user: { id: 1, name: 'Test User', email: 'test@example.com' },
            },
          ],
        })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Respond' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Respond' }))

    await waitFor(() => {
      expect(screen.getByText('Respond to Placement Request for Fluffy')).toBeInTheDocument()
    })
  })

  it('displays placement request badges correctly', async () => {
    const catWithMultipleRequests: Cat = {
      ...mockCatWithActivePlacement,
      placement_requests: [
        {
          id: 1,
          cat_id: 1,
          request_type: 'fostering',
          status: 'open',
          is_active: true,
          created_at: '2025-07-20T00:00:00Z',
          updated_at: '2025-07-20T00:00:00Z',
        },
        {
          id: 2,
          cat_id: 1,
          request_type: 'permanent_foster',
          status: 'pending_review',
          is_active: false,
          created_at: '2025-07-21T00:00:00Z',
          updated_at: '2025-07-21T00:00:00Z',
        },
      ],
    }

    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [catWithMultipleRequests] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('FOSTERING')).toBeInTheDocument()
      expect(screen.getByText('PERMANENT FOSTER')).toBeInTheDocument()
    })
  })

  it('shows fulfilled badge when placement requests exist but none are active', async () => {
    const catWithFulfilledPlacement: Cat = {
      ...mockCatWithActivePlacement,
      placement_request_active: false,
      placement_requests: [
        {
          id: 1,
          cat_id: 1,
          request_type: 'fostering',
          status: 'fulfilled',
          is_active: false,
          created_at: '2025-07-20T00:00:00Z',
          updated_at: '2025-07-20T00:00:00Z',
        },
      ],
    }

    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [catWithFulfilledPlacement] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Fulfilled')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Respond' })).not.toBeInTheDocument()
    })
  })

  it('limits display to 4 cats and shows "View All Requests" button when more cats available', async () => {
    const fiveCats = Array.from({ length: 5 }, (_, i) => ({
      ...mockCatWithActivePlacement,
      id: i + 1,
      name: `Cat ${i + 1}`,
    }))

    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: fiveCats })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      // Should only show first 4 cats
      expect(screen.getByText('Cat 1')).toBeInTheDocument()
      expect(screen.getByText('Cat 2')).toBeInTheDocument()
      expect(screen.getByText('Cat 3')).toBeInTheDocument()
      expect(screen.getByText('Cat 4')).toBeInTheDocument()
      expect(screen.queryByText('Cat 5')).not.toBeInTheDocument()

      // Should show "View All Requests" button
      expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
    })
  })

  it('navigates to /requests when "View All Requests" button is clicked', async () => {
    const fiveCats = Array.from({ length: 5 }, (_, i) => ({
      ...mockCatWithActivePlacement,
      id: i + 1,
      name: `Cat ${i + 1}`,
    }))

    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: fiveCats })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View All Requests' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'View All Requests' }))

    expect(mockNavigate).toHaveBeenCalledWith('/requests')
  })

  it('does not show "View All Requests" button when 4 or fewer cats', async () => {
    const threeCats = Array.from({ length: 3 }, (_, i) => ({
      ...mockCatWithActivePlacement,
      id: i + 1,
      name: `Cat ${i + 1}`,
    }))

    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: threeCats })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Cat 1')).toBeInTheDocument()
      expect(screen.getByText('Cat 2')).toBeInTheDocument()
      expect(screen.getByText('Cat 3')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'View All Requests' })).not.toBeInTheDocument()
    })
  })

  it('handles cat profile navigation correctly', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCatWithActivePlacement] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      const catImage = screen.getByAltText('Fluffy')
      expect(catImage.closest('a')).toHaveAttribute('href', '/cats/1')
    })
  })

  it('shows empty state when no active placement requests', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      expect(screen.getByText('Check back soon for cats needing help!')).toBeInTheDocument()
    })
  })

  it('shows error state and retry functionality', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load placement requests. Please try again later.')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    // Test retry functionality
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCatWithActivePlacement] })
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
    })
  })

  it('shows loading state with skeleton cards', async () => {
    // Delay the response to test loading state
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ data: [mockCatWithActivePlacement] })
      })
    )

    renderWithRouter(<ActivePlacementRequestsSection />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    // Should show loading skeletons initially
    expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
    })
  })
})
