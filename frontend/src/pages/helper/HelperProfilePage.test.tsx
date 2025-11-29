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

  it('renders a table of helper profiles with an edit button', async () => {
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
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText(mockHelperProfile.city)).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })
})
