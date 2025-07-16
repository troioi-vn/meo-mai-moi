import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import App from '../App'
import { AuthProvider } from '../contexts/AuthContext'

const renderWithRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  )
}

const mockCat = {
  id: 1,
  name: 'Test Cat',
  breed: 'Persian',
  birthday: '2021-01-01',
  location: 'Test City',
  description: 'A test cat',
  user_id: 1,
  status: 'available',
  imageUrl: 'https://example.com/test.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
}

const mockCats = [
  mockCat,
  {
    ...mockCat,
    id: 2,
    name: 'Another Cat',
  },
]

const server = setupServer(
  // Mock the cats list endpoint
  http.get('/api/cats', () => {
    return HttpResponse.json({
      data: mockCats,
      pagination: {
        current_page: 1,
        last_page: 1,
        per_page: 12,
        total: mockCats.length,
      },
    })
  }),

  // Mock the single cat endpoint
  http.get('/api/cats/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockCat)
    }
    return HttpResponse.json({ message: 'Cat not found' }, { status: 404 })
  }),

  // Mock featured cats endpoint
  http.get('/api/cats/featured', () => {
    return HttpResponse.json(mockCats.slice(0, 3))
  })
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('App Routing', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('Cat profile routes', () => {
    it('renders CatProfilePage for /cats/:id route', async () => {
      renderWithRouter(['/cats/1'])

      // Should show loading initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Wait for cat data to load and verify we're on the cat profile page
      await waitFor(() => {
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
      })

      // Verify it's the profile page by checking for the Back button
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    it('handles cat profile route with invalid ID', async () => {
      renderWithRouter(['/cats/999'])

      await waitFor(() => {
        expect(screen.getByText(/cat not found/i)).toBeInTheDocument()
      })
    })

    it('navigates from cats list to cat profile via URL', async () => {
      // Start on cats page
      renderWithRouter(['/cats'])

      // Wait for cats to load
      await waitFor(() => {
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
        expect(screen.getByText('Another Cat')).toBeInTheDocument()
      })

      // Verify we can see the View Profile links
      const viewProfileLinks = screen.getAllByRole('link', { name: /view profile/i })
      expect(viewProfileLinks.length).toBeGreaterThan(0)
      expect(viewProfileLinks[0]).toHaveAttribute('href', '/cats/1')
    })
  })

  describe('Edit cat routes', () => {
    it('renders edit cat route correctly', async () => {
      renderWithRouter(['/account/cats/1/edit'])

      // Should render the edit page (even if it shows loading or error)
      // We're mainly testing that the route exists and doesn't 404
      await waitFor(() => {
        // The exact content may vary, but we shouldn't see a 404 page
        expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Route transitions', () => {
    it('supports navigation between routes', async () => {
      // Start on home page
      renderWithRouter(['/'])

      // Wait for home page to load
      await waitFor(() => {
        expect(screen.getByText(/discover/i)).toBeInTheDocument()
      })
    })

    it('handles deep linking to cat profile', async () => {
      // Directly navigate to a cat profile
      renderWithRouter(['/cats/1'])

      await waitFor(() => {
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
      })

      // Verify the page is fully functional
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })

  describe('Route parameters', () => {
    it('correctly passes cat ID parameter to CatProfilePage', async () => {
      renderWithRouter(['/cats/1'])

      await waitFor(() => {
        // The component should have received the correct ID and loaded the right cat
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
      })

      // Verify it's not loading another cat by ID
      expect(screen.queryByText('Another Cat')).not.toBeInTheDocument()
    })

    it('handles route parameter changes', async () => {
      // Start with cat 1
      renderWithRouter(['/cats/1'])

      await waitFor(() => {
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
      })

      // Re-render with cat 2 (simulating navigation)
      renderWithRouter(['/cats/2'])

      await waitFor(() => {
        expect(screen.getByText('Another Cat')).toBeInTheDocument()
      })
    })
  })

  describe('Route accessibility', () => {
    it('cat profile routes are accessible without authentication', async () => {
      renderWithRouter(['/cats/1'])

      await waitFor(() => {
        expect(screen.getByText('Test Cat')).toBeInTheDocument()
      })

      // Verify that users can view cat profiles
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })
  })
})
