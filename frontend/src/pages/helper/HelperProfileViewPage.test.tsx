import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import HelperProfileViewPage from './HelperProfileViewPage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { server } from '@/testing/mocks/server'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

const renderWithRouter = (profileId = mockHelperProfile.id, authUser = null) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TestAuthProvider mockValues={{ user: authUser }}>
        <MemoryRouter initialEntries={[`/helper/${String(profileId)}`]}>
          <Routes>
            <Route path="/helper/:id" element={<HelperProfileViewPage />} />
          </Routes>
        </MemoryRouter>
      </TestAuthProvider>
    </QueryClientProvider>
  )
}

describe('HelperProfileViewPage - Placement Responses section', () => {
  it('shows linked pets with request, placement, and response statuses', async () => {
    const profileWithPets = {
      ...mockHelperProfile,
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
            status: 'open',
            pet_id: 301,
            user_id: 999,
          },
          pet: {
            id: 301,
            name: 'Fluffy',
            country: 'US',
            description: 'Friendly cat',
            status: 'active',
            pet_type_id: 1,
            pet_type: { id: 1, name: 'Cat', slug: 'cat', placement_requests_allowed: true },
            user: { id: 5, name: 'Owner', email: 'owner@test.com' },
          },
        },
      ],
    }

    server.use(
      http.get('http://localhost:3000/api/helper-profiles/:id', () => {
        return HttpResponse.json({ data: profileWithPets })
      })
    )

    renderWithRouter(profileWithPets.id)

    await waitFor(() => {
      expect(screen.getByText('Placement Responses')).toBeInTheDocument()
    })

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    expect(screen.getByText('Request: Foster (Free)')).toBeInTheDocument()
    expect(screen.getByText('Placement: Open')).toBeInTheDocument()
    expect(screen.getByText('Response: Pending Review')).toBeInTheDocument()
  })

  it('shows empty state when no pets are linked', async () => {
    server.use(
      http.get('http://localhost:3000/api/helper-profiles/:id', () => {
        return HttpResponse.json({ data: { ...mockHelperProfile, placement_responses: [] } })
      })
    )

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Placement Responses')).toBeInTheDocument()
    })

    expect(screen.getByText('No placement responses yet.')).toBeInTheDocument()
  })
})
