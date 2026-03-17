import { screen, waitFor, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AllTheProviders } from '@/testing'
import { server } from '@/testing/mocks/server'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import PublicHelperProfilesPage from './PublicHelperProfilesPage'

describe('PublicHelperProfilesPage', () => {
  it('renders public helper profiles returned by the API', async () => {
    server.use(
      http.get('http://localhost:3000/api/helpers', () => {
        return HttpResponse.json({
          data: [{ ...mockHelperProfile, status: 'public', user: { id: 1, name: 'Mai' } }],
        })
      })
    )

    render(
      <MemoryRouter initialEntries={['/helpers']}>
        <AllTheProviders>
          <PublicHelperProfilesPage />
        </AllTheProviders>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Helpers')).toBeInTheDocument()
    })

    expect(screen.getByText('Mai')).toBeInTheDocument()
    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mai/i })).toHaveAttribute('href', '/helpers/1')
  })
})
