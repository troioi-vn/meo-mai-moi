import { screen, waitFor, act } from '@testing-library/react'
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

// Mock matchMedia for PWA checks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

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
    // Mock for public pet view (in case of redirect)
    http.get('http://localhost:3000/api/pets/:id/view', ({ params }) => {
      const { id } = params
      if (id === '1') {
        return HttpResponse.json(
          { data: { ...mockPet, viewer_permissions: { is_owner: true } } },
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
    it('shows main navigation and breadcrumb on pet profile page', async () => {
      renderWithRouter(<App />, { route: '/pets/1' })

      // Wait for lazy route + pet data to load
      expect(
        await screen.findByRole('heading', { name: /Fluffy/i }, { timeout: 5000 })
      ).toBeInTheDocument()

      // MainNav should be present (Requests link is always visible)
      expect(screen.getByRole('link', { name: 'Requests' })).toBeInTheDocument()

      // Breadcrumb should also be present
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      expect(screen.getAllByText('Fluffy')[0]).toBeInTheDocument()
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
      // Increase timeout for lazy-loaded NotFoundPage
      expect(await screen.findByText(/page not found/i, {}, { timeout: 5000 })).toBeInTheDocument()
    })

    it('shows not found page for /cats/:id/edit route (legacy routes removed)', async () => {
      renderWithRouter(<App />, { route: '/cats/1/edit' })

      // Legacy /cats routes are no longer supported and should show 404
      expect(await screen.findByText(/page not found/i, {}, { timeout: 5000 })).toBeInTheDocument()
    })
  })

  describe('Settings routes', () => {
    it('renders notifications tab route correctly', async () => {
      renderWithRouter(<App />, {
        route: '/settings/notifications',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      // Wait for the notification preferences component to be rendered
      await waitFor(
        () => {
          expect(screen.getByTestId('notification-preferences')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('PWA Install Banner', () => {
    it('shows the install banner on mobile when prompt is available', async () => {
      // Mock mobile device
      const mockNavigator = {
        userAgent: 'iPhone',
        maxTouchPoints: 5,
      }
      vi.stubGlobal('navigator', mockNavigator)
      vi.stubGlobal('innerWidth', 375)

      renderWithRouter(<App />, {
        route: '/',
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      // Simulate beforeinstallprompt event
      const mockEvent = new Event('beforeinstallprompt')
      mockEvent.preventDefault = vi.fn()

      act(() => {
        window.dispatchEvent(mockEvent)
      })

      // Banner should appear
      expect(await screen.findByText('Install Meo Mai Moi')).toBeInTheDocument()

      vi.unstubAllGlobals()
    })
  })
})
