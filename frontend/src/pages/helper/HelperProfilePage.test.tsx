import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HelperProfilePage from './HelperProfilePage'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import { server } from '@/testing/mocks/server'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('HelperProfilePage', () => {
  beforeEach(() => {
    queryClient.setQueryData(['helper-profiles'], [mockHelperProfile])
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
      expect(screen.getByText('Helper Profiles')).toBeInTheDocument()
    })
    // Location should show city, state, and country
    expect(
      screen.getByText(
        `${mockHelperProfile.city}, ${mockHelperProfile.state}, ${mockHelperProfile.country}`
      )
    ).toBeInTheDocument()
    // Request type badges should be visible (based on mock data: foster_free, permanent)
    expect(screen.getByText('Foster (Free)')).toBeInTheDocument()
    expect(screen.getByText('Permanent')).toBeInTheDocument()
    // Profile card should be a clickable link
    expect(screen.getByRole('link')).toBeInTheDocument()
  })
})
