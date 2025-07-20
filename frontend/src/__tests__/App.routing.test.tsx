import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { renderWithRouter } from '@/test-utils'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import { mockUser } from '@/mocks/data/user'

// Set up mock handlers for all the routes tested in this file
beforeEach(() => {
  vi.clearAllMocks()
  server.use(
    // Mock for fetching the list of all cats
    http.get('http://localhost:3000/api/cats', () => {
      return HttpResponse.json({ data: [mockCat, anotherMockCat] })
    }),
    // Mock for fetching a single cat by ID
    http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
      const { id } = params
      if (id === '1') {
        return HttpResponse.json({ data: { ...mockCat, viewer_permissions: { can_edit: true } } })
      }
      return new HttpResponse(null, { status: 404 })
    }),
    // Mock for fetching the logged-in user
    http.get('http://localhost:3000/api/user', () => {
      return HttpResponse.json({ data: mockUser })
    }),
    // Mock for notifications
    http.get('http://localhost:3000/api/notifications', () => {
      return HttpResponse.json({ data: { notifications: [], unread_count: 1 } })
    })
  )
})

describe('App Routing', () => {
  const authenticatedState = {
    isAuthenticated: true,
    user: mockUser,
    token: 'test-token',
  }

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

    // TODO: check this laiter. Probably we do not need this test.
    // it('navigates from cats list to cat profile via URL', async () => {
    //   // Start on home page, which displays a list of cats
    //   const { user } = renderWithRouter(<App />, { route: '/', initialAuthState: authenticatedState })

    //   // Wait for cats to load on the home page
    //   await waitFor(() => {
    //     expect(screen.getByText('Fluffy')).toBeInTheDocument()
    //     expect(screen.getByText('Whiskers')).toBeInTheDocument()
    //   })

    //   // Assuming CatsSection renders a link to the cat's profile with the cat's name
    //   const fluffyCatLink = screen.getByText('Fluffy')
    //   await user.click(fluffyCatLink)

    //   // Wait for the CatProfilePage to load
    //   await screen.findByText(/about fluffy/i)
    // })
  })

  describe('Edit cat routes', () => {
    it('renders edit cat route correctly', async () => {
      renderWithRouter(<App />, { route: '/cats/1/edit' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit cat profile/i })).toBeInTheDocument()
      })
    })
  })

  describe('Route transitions', () => {
    it('supports navigation between routes', async () => {
      const { user } = renderWithRouter(<App />, {
        route: '/',
      })

      // From home to a cat's profile by clicking on the cat's name
      const catProfileLink = await screen.findByText('Fluffy')
      await user.click(catProfileLink)
      await waitFor(
        () => {
          expect(screen.getByText(mockCat.name)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Back to home
      const homeLink = screen.getByRole('link', { name: /meo!/i })
      await user.click(homeLink)
      await waitFor(() => {
        expect(screen.getByText(/find your new best friend/i)).toBeInTheDocument()
      })
    })
  })
})
