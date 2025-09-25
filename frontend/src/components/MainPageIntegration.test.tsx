import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import MainPage from '@/pages/MainPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import type { Pet } from '@/types/pet'
import { mockCatType } from '@/mocks/data/pets'

describe('MainPage Integration with ActivePlacementRequestsSection', () => {
  const mockPetWithActivePlacement: Pet = {
    id: 1,
    name: 'Fluffy',
    breed: 'Persian',
    birthday: '2020-01-15',
    status: 'active',
    description: 'A very friendly and fluffy cat.',
    location: 'New York, NY',
    photo_url: 'http://localhost:3000/storage/pets/profiles/fluffy.jpg',
    user_id: 2, // Different from authenticated user (id: 1)
    pet_type_id: 1,
    pet_type: mockCatType,
    user: {
      id: 2,
      name: 'Pet Owner',
      email: 'owner@example.com',
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    viewer_permissions: {
      can_edit: false,
      can_view_contact: true,
    },
    placement_requests: [
      {
        id: 1,
        pet_id: 1,
        request_type: 'fostering',
        status: 'open',
        notes: 'Looking for a loving home.',
        is_active: true,
        created_at: '2025-07-20T00:00:00Z',
        updated_at: '2025-07-20T00:00:00Z',
        transfer_requests: [],
      },
    ],
    placement_request_active: true,
  }

  it('renders ActivePlacementRequestsSection within MainPage with proper layout', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPetWithActivePlacement] })
      })
    )

    renderWithRouter(<MainPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isLoading: false,
        isAuthenticated: true,
      },
    })

    // Verify that both HeroSection and ActivePlacementRequestsSection are rendered
    await waitFor(() => {
      // Check for HeroSection content (assuming it has some identifiable text)
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()

      // Check for ActivePlacementRequestsSection content
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
      expect(screen.getByText('Persian - 5 years old')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Respond' })).toBeInTheDocument()
    })

    // Verify proper layout structure
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toHaveClass('flex-1')
  })

  it('maintains responsive layout with both sections', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPetWithActivePlacement] })
      })
    )

    renderWithRouter(<MainPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
    })

    // Check that the grid layout classes are applied correctly
    const catCard = screen.getByText('Fluffy').closest('[data-slot="card"]')
    expect(catCard).toBeInTheDocument()

    // Verify the section has proper container classes
    const section = screen.getByText('Active Placement Requests').closest('section')
    expect(section).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')
  })

  it('handles empty state gracefully within MainPage', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [] })
      })
    )

    renderWithRouter(<MainPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' } as any,
        isLoading: false,
        isAuthenticated: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Active Placement Requests')).toBeInTheDocument()
      expect(screen.getByText('No active placement requests at the moment.')).toBeInTheDocument()
      expect(screen.getByText('Check back soon for pets needing help!')).toBeInTheDocument()
    })
  })
})
