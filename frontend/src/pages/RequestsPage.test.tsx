import { renderWithRouter, screen, userEvent, waitFor } from '@/testing'
import { describe, it, expect } from 'vitest'
import RequestsPage from '@/pages/RequestsPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import { mockPet } from '@/testing/mocks/data/pets'

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
    expect(await screen.findByRole('combobox', { name: 'Request Type Filter' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Pet Type Filter' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Country Filter' })).toBeInTheDocument()
    expect(await screen.findByText(/pickup/i)).toBeInTheDocument()
    expect(await screen.findByText(/drop-off/i)).toBeInTheDocument()
    expect(
      await screen.findByRole('combobox', { name: 'Pickup Date Comparison' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('combobox', { name: 'Drop-off Date Comparison' })
    ).toBeInTheDocument()
  })

  it('hides drop-off date filter when permanent request type is selected', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<RequestsPage />)

    // Initially, drop-off is visible
    expect(await screen.findByText(/drop-off/i)).toBeInTheDocument()

    // Select "Permanent" request type
    await user.click(screen.getByLabelText('Request Type Filter'))
    await user.click(screen.getByRole('option', { name: /permanent/i }))

    // Drop-off should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/drop-off/i)).not.toBeInTheDocument()
    })
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

  it('filters pets by request type', async () => {
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
                  request_type: 'permanent',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  status: 'open',
                  notes: 'Looking for permanent adoption',
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
                  request_type: 'foster_free',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  status: 'open',
                  notes: 'Looking for free fostering',
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

    // Select the "Foster (Free)" filter
    await user.click(screen.getByLabelText('Request Type Filter'))
    await user.click(screen.getByRole('option', { name: /foster \(free\)/i }))

    // Only Whiskers should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })

    // Select the "Permanent" filter
    await user.click(screen.getByLabelText('Request Type Filter'))
    await user.click(screen.getByRole('option', { name: /permanent/i }))

    // Only Fluffy should be visible
    await waitFor(() => {
      expect(screen.getByText(/fluffy/i)).toBeInTheDocument()
      expect(screen.queryByText(/whiskers/i)).not.toBeInTheDocument()
    })
  })

  it('filters pets by country', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({
          data: [
            {
              ...mockPet,
              country: 'VN',
              placement_requests: [
                {
                  id: 1,
                  pet_id: 1,
                  request_type: 'permanent',
                  status: 'open',
                },
              ],
            },
            {
              ...mockPet,
              id: 2,
              name: 'Whiskers',
              country: 'US',
              placement_requests: [
                {
                  id: 2,
                  pet_id: 2,
                  request_type: 'foster_free',
                  status: 'open',
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

    // Select the "United States" filter
    await user.click(screen.getByLabelText('Country Filter'))
    await user.click(screen.getByRole('option', { name: /united states/i }))

    // Only Whiskers (US) should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })
  })
})
