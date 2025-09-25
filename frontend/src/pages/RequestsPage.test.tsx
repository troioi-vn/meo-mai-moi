import { renderWithRouter, screen, userEvent, waitFor } from '@/test-utils'
import { describe, it, expect } from 'vitest'
import RequestsPage from '@/pages/RequestsPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { mockPet } from '@/mocks/data/pets'

describe('RequestsPage', () => {
  it('renders the page title', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByRole('heading', { name: /placement requests/i })).toBeInTheDocument()
  })

  it('renders the filter controls', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByRole('combobox', { name: 'Type Filter' })).toBeInTheDocument()
    expect(await screen.findByText(/start date/i)).toBeInTheDocument()
    expect(await screen.findByText(/end date/i)).toBeInTheDocument()
  })

  it('renders a pet card', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
  })

  it('filters pets by type', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({
          data: [
            {
              ...mockPet,
              placement_requests: [
                {
                  id: 1,
                  pet_id: 1,
                  request_type: 'adoption',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  is_active: true,
                  status: 'open',
                  notes: 'Looking for adoption',
                  created_at: '2025-07-20T00:00:00Z',
                  updated_at: '2025-07-20T00:00:00Z',
                  transfer_requests: [],
                },
              ],
            },
            {
              ...mockPet,
              id: 2,
              name: 'Whiskers',
              placement_requests: [
                {
                  id: 2,
                  pet_id: 2,
                  request_type: 'fostering',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  is_active: true,
                  status: 'open',
                  notes: 'Looking for fostering',
                  created_at: '2025-07-20T00:00:00Z',
                  updated_at: '2025-07-20T00:00:00Z',
                  transfer_requests: [],
                },
              ],
            },
          ],
        })
      })
    )
    renderWithRouter(<RequestsPage />)

    // Initially, both pets are visible
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
    expect(await screen.findByText(/whiskers/i)).toBeInTheDocument()

    // Select the "Foster" filter
    await user.click(screen.getByLabelText('Type Filter'))
    await user.click(screen.getByRole('option', { name: /foster/i }))

    // Only Whiskers should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })

    // Select the "Adoption" filter
    await user.click(screen.getByLabelText('Type Filter'))
    await user.click(screen.getByRole('option', { name: /adoption/i }))

    // Only Fluffy should be visible
    await waitFor(() => {
      expect(screen.getByText(/fluffy/i)).toBeInTheDocument()
      expect(screen.queryByText(/whiskers/i)).not.toBeInTheDocument()
    })
  })
})
