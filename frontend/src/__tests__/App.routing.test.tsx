import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { renderWithRouter } from '@/test-utils'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('App Routing', () => {
  describe('Cat profile routes', () => {
    it('renders CatProfilePage for /cats/:id route', async () => {
      renderWithRouter(<App />, { route: '/cats/1' })

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Wait for cat data to load and verify we're on the cat profile page
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument()
      })

      // Verify it's the profile page by checking for the Back button
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('handles cat profile route with invalid ID', async () => {
      renderWithRouter(<App />, { route: '/cats/999' })

      await waitFor(() => {
        expect(screen.getByText(/cat not found/i)).toBeInTheDocument()
      })
    })

    it('navigates from cats list to cat profile via URL', async () => {
      // Start on cats page
      renderWithRouter(<App />, { route: '/cats' })

      // Wait for cats to load
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument()
        expect(screen.getByText('Whiskers')).toBeInTheDocument()
      })

      // Verify we can see the View Profile links
      const viewProfileLinks = screen.getAllByRole('link', { name: /view profile/i })
      expect(viewProfileLinks.length).toBeGreaterThan(0)
      expect(viewProfileLinks[0]).toHaveAttribute('href', '/cats/1')
    })
  })

  describe('Edit cat routes', () => {
    it('renders edit cat route correctly', async () => {
      renderWithRouter(<App />, { route: '/account/cats/1/edit' })

      await waitFor(() => {
        expect(screen.getByText('Edit Cat Profile')).toBeInTheDocument()
      })
    })
  })

  describe('Route transitions', () => {
    it('supports navigation between routes', async () => {
      const { container, user } = renderWithRouter(<App />, { route: '/' })

      // From home to cats list
      const catsLink = screen.getByRole('link', { name: /all cats/i })
      await user.click(catsLink)
      await waitFor(() => {
        expect(screen.getByText('Find Your Perfect Companion')).toBeInTheDocument()
      })

      // From cats list to a cat's profile
      const catProfileLink = await screen.findByText('Fluffy')
      await user.click(catProfileLink)
      await waitFor(() => {
        expect(screen.getByText(/about fluffy/i)).toBeInTheDocument()
      })

      // Back to home
      const homeLink = screen.getByRole('link', { name: /meo!/i })
      await user.click(homeLink)
      await waitFor(() => {
        expect(container.querySelector('.featured-cats-grid')).toBeInTheDocument()
      })
    })
  })
})
