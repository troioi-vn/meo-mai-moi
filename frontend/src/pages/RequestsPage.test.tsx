import { renderWithRouter, screen, userEvent, waitFor } from '@/test-utils'
import { describe, it, expect } from 'vitest'
import RequestsPage from '@/pages/RequestsPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { mockCat } from '@/mocks/data/cats'

describe('RequestsPage', () => {
  it('renders the page title', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCat] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByRole('heading', { name: /placement requests/i })).toBeInTheDocument()
  })

  it('renders the filter controls', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCat] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByRole('combobox')).toBeInTheDocument()
    expect(await screen.findByText(/start date/i)).toBeInTheDocument()
    expect(await screen.findByText(/end date/i)).toBeInTheDocument()
  })

  it('renders a cat card', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({ data: [mockCat] })
      })
    )
    renderWithRouter(<RequestsPage />)
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
  })

  it('filters cats by type', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('http://localhost:3000/api/cats/placement-requests', () => {
        return HttpResponse.json({
          data: [
            {
              ...mockCat,
              placement_requests: [
                {
                  request_type: 'adoption',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  is_active: true,
                  status: 'open',
                },
              ],
            },
            {
              ...mockCat,
              id: 2,
              name: 'Whiskers',
              placement_requests: [
                {
                  request_type: 'foster',
                  start_date: '2025-08-01',
                  end_date: '2025-09-01',
                  is_active: true,
                  status: 'open',
                },
              ],
            },
          ],
        })
      })
    )
    renderWithRouter(<RequestsPage />)

    // Initially, both cats are visible
    expect(await screen.findByText(/fluffy/i)).toBeInTheDocument()
    expect(await screen.findByText(/whiskers/i)).toBeInTheDocument()

    // Select the "Foster" filter
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /foster/i }))

    // Only Whiskers should be visible
    await waitFor(() => {
      expect(screen.queryByText(/fluffy/i)).not.toBeInTheDocument()
      expect(screen.getByText(/whiskers/i)).toBeInTheDocument()
    })

    // Select the "Adoption" filter
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /adoption/i }))

    // Only Fluffy should be visible
    await waitFor(() => {
      expect(screen.getByText(/fluffy/i)).toBeInTheDocument()
      expect(screen.queryByText(/whiskers/i)).not.toBeInTheDocument()
    })
  })
})
