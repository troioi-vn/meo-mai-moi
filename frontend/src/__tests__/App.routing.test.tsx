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
        return HttpResponse.json(
          { data: { ...mockCat, viewer_permissions: { can_edit: true } } },
          { headers: { 'Content-Type': 'application/json' } }
        )
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
  describe('Cat profile routes', () => {
    it('renders CatProfilePage for /cats/:id route', async () => {
      renderWithRouter(<App />, { route: '/cats/1' })

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Wait for cat data to load and verify we're on the cat profile page
      await waitFor(async () => {
        expect(await screen.findByText('Fluffy')).toBeInTheDocument()
      })

      // Verify it's the profile page by checking for the Back button
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('handles cat profile route with invalid ID', async () => {
      // Suppress console.error for this test as we expect a 404 error
      vi.spyOn(console, 'error').mockImplementation(() => {
        /* empty */
      })

      renderWithRouter(<App />, { route: '/cats/999' })

      await waitFor(async () => {
        expect(await screen.findByText(/cat not found/i)).toBeInTheDocument()
      })

      // Restore console.error after the test
      vi.restoreAllMocks()
    })
  })

  describe('Edit cat routes', () => {
    it('renders edit cat route correctly', async () => {
      renderWithRouter(<App />, {
        route: '/cats/1/edit',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      await waitFor(
        async () => {
          expect(
            await screen.findByRole('heading', { name: /edit cat profile/i })
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })
})
