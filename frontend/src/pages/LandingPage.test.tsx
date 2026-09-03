import { renderWithRouter, screen } from '@/testing'
import { describe, it, expect } from 'vite-plus/test'
import LandingPage from '@/pages/LandingPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'
import { mockPet } from '@/testing/mocks/data/pets'

describe('LandingPage', () => {
  it('links recent pet cards to their placement request, not the pet profile', async () => {
    server.use(
      http.get('http://localhost:3000/api/pets/placement-requests', () => {
        return HttpResponse.json({ data: [mockPet] })
      })
    )
    renderWithRouter(<LandingPage />)

    expect(await screen.findByText(/pets looking for help/i)).toBeInTheDocument()

    const cardLinks = await screen.findAllByRole('link', { name: 'Fluffy' })
    cardLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/requests/1')
    })
  })
})
