import { screen, waitFor, render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AllTheProviders, testQueryClient } from '@/testing'
import { http, HttpResponse } from 'msw'
import HelperProfileViewPage from './HelperProfileViewPage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { server } from '@/testing/mocks/server'

const renderHelperProfile = (profileId = mockHelperProfile.id, authUser = null) => {
  testQueryClient.clear()
  return render(
    <MemoryRouter initialEntries={[`/helper/${String(profileId)}`]}>
      <AllTheProviders
        initialAuthState={{ user: authUser, isLoading: false, isAuthenticated: !!authUser }}
      >
        <Routes>
          <Route path="/helper/:id" element={<HelperProfileViewPage />} />
        </Routes>
      </AllTheProviders>
    </MemoryRouter>
  )
}

describe('HelperProfileViewPage - Placement Responses section', () => {
  it('shows linked placement requests with owner, pet, responded date, and status', async () => {
    const profileWithPets = {
      ...mockHelperProfile,
      user_id: 500,
      placement_responses: [
        {
          id: 101,
          placement_request_id: 201,
          helper_profile_id: 1,
          status: 'responded',
          responded_at: '2025-08-05T10:00:00Z',
          created_at: '2025-08-05T10:00:00Z',
          updated_at: '2025-08-05T10:00:00Z',
          placement_request: {
            id: 201,
            request_type: 'foster_free',
            status: 'pending_transfer',
            pet_id: 301,
            user_id: 999,
            transfer_requests: [
              {
                id: 701,
                placement_request_id: 201,
                from_user_id: 999,
                to_user_id: 500,
                status: 'pending',
              },
            ],
          },
          pet: {
            id: 301,
            name: 'Fluffy',
            country: 'US',
            description: 'Friendly cat',
            status: 'active',
            pet_type_id: 1,
            pet_type: { id: 1, name: 'Cat', slug: 'cat', placement_requests_allowed: true },
            user: { id: 5, name: 'Alice Owner', email: 'owner@test.com' },
          },
        },
      ],
    }

    server.use(
      http.get('http://localhost:3000/api/helper-profiles/:id', () => {
        return HttpResponse.json({ data: profileWithPets })
      })
    )

    renderHelperProfile(profileWithPets.id)

    await waitFor(() => {
      expect(screen.getByText(/Placement Requests/)).toBeInTheDocument()
    })

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    expect(screen.getByText('Alice Owner')).toBeInTheDocument()
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
    expect(screen.getByText('Action required')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Open placement request 201/i })
    expect(link).toHaveAttribute('href', '/requests/201')
  })

  it('shows empty state when no pets are linked', async () => {
    server.use(
      http.get('http://localhost:3000/api/helper-profiles/:id', () => {
        return HttpResponse.json({ data: { ...mockHelperProfile, placement_responses: [] } })
      })
    )

    renderHelperProfile()

    await waitFor(() => {
      expect(screen.getByText(/Placement Requests/)).toBeInTheDocument()
    })

    expect(screen.getByText('No placement requests yet.')).toBeInTheDocument()
  })
})
