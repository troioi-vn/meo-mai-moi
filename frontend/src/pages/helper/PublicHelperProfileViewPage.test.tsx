import { screen, waitFor, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AllTheProviders } from '@/testing'
import { server } from '@/testing/mocks/server'
import { mockHelperProfile } from '@/testing/mocks/data/helper-profiles'
import PublicHelperProfileViewPage from './PublicHelperProfileViewPage'

describe('PublicHelperProfileViewPage', () => {
  it('renders a public helper profile', async () => {
    server.use(
      http.get('http://localhost:3000/api/helpers/:id', () => {
        return HttpResponse.json({
          data: {
            ...mockHelperProfile,
            status: 'public',
            user: { id: 1, name: 'Mai' },
          },
        })
      })
    )

    render(
      <MemoryRouter initialEntries={['/helpers/1']}>
        <AllTheProviders>
          <Routes>
            <Route path="/helpers/:id" element={<PublicHelperProfileViewPage />} />
          </Routes>
        </AllTheProviders>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mai' })).toBeInTheDocument()
    })

    expect(screen.getByText('Public')).toBeInTheDocument()
    expect(screen.getByText(/5 years of experience/i)).toBeInTheDocument()
  })
})
