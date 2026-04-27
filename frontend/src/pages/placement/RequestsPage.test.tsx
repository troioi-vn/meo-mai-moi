import { renderWithRouter, screen, userEvent, waitFor } from '@/testing'
import { describe, it, expect } from 'vite-plus/test'
import RequestsPage from '@/pages/placement/RequestsPage'
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
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<RequestsPage />)
    await user.click(await screen.findByLabelText('Filters'))

    // Request type chips
    expect(await screen.findByRole('button', { name: /foster \(paid\)/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /foster \(free\)/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /permanent/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /pet sitting/i })).toBeInTheDocument()

    // Country still a combobox
    expect(await screen.findByRole('combobox', { name: 'Country Filter' })).toBeInTheDocument()

    // Sort segmented buttons
    expect(await screen.findByRole('button', { name: /newest first/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /oldest first/i })).toBeInTheDocument()

    // Date rows
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

    await user.click(await screen.findByLabelText('Filters'))

    // Initially, drop-off is visible
    expect(await screen.findByText(/drop-off/i)).toBeInTheDocument()

    // Click the "Permanent" chip
    await user.click(screen.getByRole('button', { name: /^permanent$/i }))

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
                  responses: [],
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
                  responses: [],
                },
              ],
            },
          ],
        })
      })
    )
    renderWithRouter(<RequestsPage />)

    await user.click(await screen.findByLabelText('Filters'))

    // Initially, both pets are visible
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
    expect(await screen.findByText(/whiskers/i)).toBeInTheDocument()

    // Click the "Foster (Free)" chip
    await user.click(screen.getByRole('button', { name: /foster \(free\)/i }))

    // Only Whiskers should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })

    // Click "Permanent" chip — switches filter directly (no need to deselect first)
    await user.click(screen.getByRole('button', { name: /^permanent$/i }))

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

    await user.click(await screen.findByLabelText('Filters'))

    // Initially, both pets are visible
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
    expect(await screen.findByText(/whiskers/i)).toBeInTheDocument()

    // Select the "United States" filter via country combobox
    await user.click(screen.getByLabelText('Country Filter'))
    await user.click(screen.getByRole('option', { name: /united states/i }))

    // Only Whiskers (US) should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })
  })

  it('initializes sort from the query string', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({
          data: [
            {
              ...mockPet,
              name: 'Newest',
              placement_requests: [
                {
                  id: 1,
                  pet_id: 1,
                  request_type: 'permanent',
                  status: 'open',
                  created_at: '2025-09-01T00:00:00Z',
                },
              ],
            },
            {
              ...mockPet,
              id: 2,
              name: 'Oldest',
              placement_requests: [
                {
                  id: 2,
                  pet_id: 2,
                  request_type: 'permanent',
                  status: 'open',
                  created_at: '2025-06-01T00:00:00Z',
                },
              ],
            },
          ],
        })
      })
    )

    renderWithRouter(<RequestsPage />, { initialEntries: ['/requests?sort=oldest'] })

    const initialOrder = await screen.findAllByText(/^(Oldest|Newest)$/)
    expect(initialOrder.map((el) => el.textContent)).toEqual(['Oldest', 'Newest'])
  })

  it('sorts pets by placement request created_at', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({
          data: [
            {
              ...mockPet,
              name: 'Newest',
              placement_requests: [
                {
                  id: 1,
                  pet_id: 1,
                  request_type: 'permanent',
                  status: 'open',
                  created_at: '2025-09-01T00:00:00Z',
                },
              ],
            },
            {
              ...mockPet,
              id: 2,
              name: 'Oldest',
              placement_requests: [
                {
                  id: 2,
                  pet_id: 2,
                  request_type: 'permanent',
                  status: 'open',
                  created_at: '2025-06-01T00:00:00Z',
                },
              ],
            },
          ],
        })
      })
    )

    renderWithRouter(<RequestsPage />)

    await user.click(await screen.findByLabelText('Filters'))

    const initialOrder = await screen.findAllByText(/^(Newest|Oldest)$/)
    expect(initialOrder.map((el) => el.textContent)).toEqual(['Newest', 'Oldest'])

    // Click the "Oldest first" sort button directly
    await user.click(screen.getByRole('button', { name: /oldest first/i }))

    await waitFor(() => {
      const reordered = screen.getAllByText(/^(Oldest|Newest)$/)
      expect(reordered.map((el) => el.textContent)).toEqual(['Oldest', 'Newest'])
    })
  })
})
