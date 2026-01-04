import { screen, waitFor, render } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PetPublicProfilePage from './PetPublicProfilePage'
import { AllTheProviders } from '@/testing/providers'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import type { PublicPet } from '@/api/pets'

// Helper to render with proper route params
const renderPetPublicProfilePage = (
  petId: string,
  authUser?: { id: number; name: string; email: string }
) => {
  const initialAuthState = authUser
    ? { user: authUser as never, isLoading: false, isAuthenticated: true }
    : { user: null, isLoading: false, isAuthenticated: false }

  return render(
    <MemoryRouter initialEntries={[`/pets/${petId}/view`]}>
      <AllTheProviders initialAuthState={initialAuthState}>
        <Routes>
          <Route path="/pets/:id/view" element={<PetPublicProfilePage />} />
        </Routes>
      </AllTheProviders>
    </MemoryRouter>
  )
}

const mockPublicPet: PublicPet = {
  id: 1,
  name: 'Fluffy',
  sex: 'female',
  birthday_precision: 'year',
  birthday_year: 2020,
  birthday_month: null,
  birthday_day: null,
  country: 'US',
  state: 'California',
  city: 'Los Angeles',
  description: 'A friendly cat looking for a home',
  status: 'active',
  pet_type_id: 1,
  photo_url: null,
  photos: [],
  pet_type: {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    is_active: true,
    is_system: true,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  categories: [],
  placement_requests: [
    {
      id: 1,
      pet_id: 1,
      request_type: 'permanent',
      status: 'open',
      responses: [],
    },
  ],
  viewer_permissions: {
    is_owner: false,
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockLostPet: PublicPet = {
  ...mockPublicPet,
  id: 2,
  name: 'Lost Kitty',
  status: 'lost',
  placement_requests: [],
}

describe('PetPublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders public pet profile with placement request section', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({ data: mockPublicPet })
      })
    )

    renderPetPublicProfilePage('1')

    await waitFor(async () => {
      expect(await screen.findByText('Fluffy')).toBeInTheDocument()
    })

    // Should show placement requests section
    expect(screen.getByText('Placement Requests')).toBeInTheDocument()
    expect(screen.getByText('Available for Placement')).toBeInTheDocument()
  })

  it('shows owner banner when owner views public profile', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({
          data: {
            ...mockPublicPet,
            viewer_permissions: { is_owner: true },
          },
        })
      })
    )

    renderPetPublicProfilePage('1')

    await waitFor(async () => {
      expect(
        await screen.findByText('You are viewing the public profile of your pet.')
      ).toBeInTheDocument()
    })
  })

  it('shows lost pet banner for lost pets', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({ data: mockLostPet })
      })
    )

    renderPetPublicProfilePage('2')

    await waitFor(async () => {
      expect(await screen.findByText('Lost Kitty')).toBeInTheDocument()
    })

    expect(screen.getByText(/this pet has been reported as lost/i)).toBeInTheDocument()
  })

  it('shows error message when pet is not publicly available', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json(
          { message: 'This pet profile is not publicly available.' },
          { status: 403 }
        )
      })
    )

    renderPetPublicProfilePage('1')

    await waitFor(async () => {
      expect(
        await screen.findByText('This pet profile is not publicly available.')
      ).toBeInTheDocument()
    })
  })

  it('shows pet details section with location and categories', async () => {
    const petWithCategories: PublicPet = {
      ...mockPublicPet,
      categories: [
        {
          id: 1,
          name: 'Indoor',
          slug: 'indoor',
          pet_type_id: 1,
          usage_count: 10,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
    }

    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({ data: petWithCategories })
      })
    )

    renderPetPublicProfilePage('1')

    await waitFor(async () => {
      expect(await screen.findByText('Details')).toBeInTheDocument()
    })

    expect(screen.getByText('Los Angeles, California, US')).toBeInTheDocument()
    expect(screen.getByText('Indoor')).toBeInTheDocument()
  })

  it('shows description section when pet has description', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({ data: mockPublicPet })
      })
    )

    renderPetPublicProfilePage('1')

    await waitFor(async () => {
      expect(await screen.findByText('About')).toBeInTheDocument()
    })

    expect(screen.getByText('A friendly cat looking for a home')).toBeInTheDocument()
  })

  it('shows message when owner tries to respond to their own pet placement request', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/:id/view', () => {
        return HttpResponse.json({
          data: {
            ...mockPublicPet,
            viewer_permissions: { is_owner: true },
          },
        })
      })
    )

    // Render with authenticated user to trigger the owner check
    renderPetPublicProfilePage('1', { id: 1, name: 'Owner', email: 'owner@test.com' })

    await waitFor(async () => {
      expect(await screen.findByText('Fluffy')).toBeInTheDocument()
    })

    // Should show message that owner cannot respond
    expect(
      screen.getByText("You cannot respond to your own pet's placement request.")
    ).toBeInTheDocument()
  })
})
