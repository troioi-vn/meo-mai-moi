import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import HelperProfileViewPage from './HelperProfileViewPage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { server } from '@/testing/mocks/server'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

const renderWithRouter = (profileId = mockHelperProfile.id) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/helper/${String(profileId)}`]}>
        <Routes>
          <Route path="/helper/:id" element={<HelperProfileViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HelperProfileViewPage - Pets section', () => {
  it('shows linked pets with request, placement, and transfer statuses', async () => {
    const profileWithPets = {
      ...mockHelperProfile,
      transfer_requests: [
        {
          id: 101,
          status: 'pending',
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
      expect(screen.getByText('Pets')).toBeInTheDocument()
    })

    expect(screen.getByText('Fluffy')).toBeInTheDocument()
    expect(screen.getByText('Request: Foster Free')).toBeInTheDocument()
    expect(screen.getByText('Placement: Open')).toBeInTheDocument()
    expect(screen.getByText('Transfer: Pending')).toBeInTheDocument()
  })

  it('shows empty state when no pets are linked', async () => {
    server.use(
      http.get('http://localhost:3000/api/helper-profiles/:id', () => {
        return HttpResponse.json({ data: { ...mockHelperProfile, transfer_requests: [] } })
      })
    )

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Pets')).toBeInTheDocument()
    })

    expect(screen.getByText('No pets linked to this profile yet.')).toBeInTheDocument()
  })
})

