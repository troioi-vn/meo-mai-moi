import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HelperProfilePage from './HelperProfilePage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'

const queryClient = new QueryClient()

describe('HelperProfilePage', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/helper-profiles', () => {
        return HttpResponse.json({ data: [mockHelperProfile] })
      })
    )
  })

  it('renders helper profiles with location and edit button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HelperProfilePage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('My Helper Profiles')).toBeInTheDocument()
    })
    // Location should show city and state
    expect(
      screen.getByText(`${mockHelperProfile.city}, ${mockHelperProfile.state}`)
    ).toBeInTheDocument()
    // Public badge should be visible
    expect(screen.getByText('Public')).toBeInTheDocument()
    // Edit button (now icon button with pencil)
    expect(screen.getByRole('link', { name: '' })).toBeInTheDocument()
  })
})
