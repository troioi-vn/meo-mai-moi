import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App'
import { renderWithRouter } from '@/testing'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import { mockPet, anotherMockCat } from '@/testing/mocks/data/pets'
import { mockUser } from '@/testing/mocks/data/user'

vi.mock('@/components/notifications/NotificationPreferences', () => ({
  NotificationPreferences: () => (
    <div data-testid="notification-preferences">Notification Preferences Component</div>
  ),
}))

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
    // Mock for unified notifications
    http.get('http://localhost:3000/api/notifications/unified', () => {
      return HttpResponse.json({
        bell_notifications: [],
        unread_bell_count: 1,
        unread_message_count: 0,
      })
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
    }),
    // Mock for impersonation status
    http.get('http://localhost:3000/api/impersonation/status', () => {
      return HttpResponse.json({ is_impersonating: false })
    })
  )
})

describe('App Routing', () => {
  describe('Pet profile routes', () => {
    it('shows main navigation and back button on pet profile page', async () => {
      renderWithRouter(<App />, { route: '/pets/1' })

      // Wait for pet data to load
      await waitFor(async () => {
        expect(await screen.findByText('Fluffy')).toBeInTheDocument()
      })

      // MainNav should be present (Requests link is always visible)
      expect(screen.getByRole('link', { name: 'Requests' })).toBeInTheDocument()

      // Back button should also be present
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('shows main navigation on other pages', async () => {
      renderWithRouter(<App />, { route: '/' })

      // MainNav should be present (Requests link is always visible)
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Requests' })).toBeInTheDocument()
      })
    })
  })

  describe('Legacy cat routes (no longer supported)', () => {
    it('shows not found page for /cats/:id route (legacy routes removed)', async () => {
      renderWithRouter(<App />, { route: '/cats/1' })

      // Legacy /cats routes are no longer supported and should show 404
      await waitFor(async () => {
        expect(await screen.findByText(/not found/i)).toBeInTheDocument()
      })
    })

    it('shows not found page for /cats/:id/edit route (legacy routes removed)', async () => {
      renderWithRouter(<App />, { route: '/cats/1/edit' })

      // Legacy /cats routes are no longer supported and should show 404
      await waitFor(async () => {
        expect(await screen.findByText(/not found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Settings routes', () => {
    it('renders notifications tab route correctly', async () => {
      renderWithRouter(<App />, {
        route: '/settings/notifications',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      await waitFor(
        async () => {
          expect(await screen.findByText(/notification settings/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
    })
  })
})
