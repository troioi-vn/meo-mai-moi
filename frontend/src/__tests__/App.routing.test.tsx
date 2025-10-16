import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'
import { renderWithRouter } from '@/test-utils'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockPet, anotherMockCat } from '@/mocks/data/pets'
import { mockUser } from '@/mocks/data/user'

// Set up mock handlers for all the routes tested in this file
beforeEach(() => {
  vi.clearAllMocks()
  server.use(
    // Mock for fetching the list of all pets
    http.get('http://localhost:3000/api/pets', () => {
      return HttpResponse.json({ data: [mockPet, anotherMockCat] })
    }),
    // Mock for fetching a single pet by ID
    http.get('http://localhost:3000/api/pets/:id', ({ params }) => {
      const { id } = params
      if (id === '1') {
        return HttpResponse.json(
          { data: { ...mockPet, viewer_permissions: { can_edit: true } } },
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
    }),
    // Mock for notification preferences
    http.get('http://localhost:3000/api/notification-preferences', () => {
      return HttpResponse.json({
        data: [
          {
            type: 'placement_request_response',
            label: 'Response to Placement Request',
            email_enabled: true,
            in_app_enabled: true,
          },
        ],
      })
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

      // Verify it's the profile page by checking for the cat's name
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
    })

    it('handles cat profile route with invalid ID (redirects to pet route)', async () => {
      // Suppress console.error for this test as we expect a 404 error
      vi.spyOn(console, 'error').mockImplementation(() => {
        /* empty */
      })

      renderWithRouter(<App />, { route: '/cats/999' })

      await waitFor(async () => {
        expect(await screen.findByText(/pet not found/i)).toBeInTheDocument()
      })

      // Restore console.error after the test
      vi.restoreAllMocks()
    })
  })

  describe('Edit cat routes', () => {
    it('renders edit cat route correctly (redirects to pet route)', async () => {
      renderWithRouter(<App />, {
        route: '/cats/1/edit',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      await waitFor(
        async () => {
          expect(await screen.findByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Account routes', () => {
    it('renders notifications page route correctly', async () => {
      renderWithRouter(<App />, {
        route: '/account/notifications',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      await waitFor(
        async () => {
          expect(
            await screen.findByRole('heading', { name: /notification settings/i })
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify breadcrumbs are present
      expect(screen.getByText('Notifications')).toBeInTheDocument()

      // Verify back button is present
      expect(screen.getByRole('link', { name: /back to account/i })).toBeInTheDocument()
    })
  })
})
