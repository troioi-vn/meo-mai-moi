import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import CatProfilePage from './CatProfilePage'

const mockCat = {
  id: 1,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2021-01-01',
  location: 'New York, NY',
  description: 'A very friendly and fluffy cat who loves to play and cuddle.',
  user_id: 1,
  status: 'available' as const,
  imageUrl: 'https://example.com/fluffy.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
}

const mockCatWithEditPermissions = {
  ...mockCat,
  viewer_permissions: {
    can_edit: true,
    can_view_contact: false,
  },
}

const server = setupServer(
  http.get('/api/cats/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockCat)
    }
    if (id === '999') {
      return HttpResponse.json({ message: 'Cat not found' }, { status: 404 })
    }
    return HttpResponse.json({ message: 'Failed to fetch cat' }, { status: 500 })
  })
)

beforeEach(() => {
  vi.clearAllMocks()
})

const renderWithRouter = (catId: string) => {
  return render(
    <MemoryRouter initialEntries={[`/cats/${catId}`]}>
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CatProfilePage', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('renders cat profile information correctly', async () => {
    renderWithRouter('1')

    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for cat data to load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument()
    })

    // Check all cat information is displayed
    expect(screen.getByText(/Persian/)).toBeInTheDocument()
    expect(screen.getByText(/4 years old/)).toBeInTheDocument() // Calculated from 2020-01-15
    expect(screen.getByText('New York, NY')).toBeInTheDocument()
    expect(
      screen.getByText('A very friendly and fluffy cat who loves to play and cuddle.')
    ).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('displays cat image with correct alt text', async () => {
    renderWithRouter('1')

    await waitFor(() => {
      const image = screen.getByAltText('Fluffy')
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', 'https://example.com/fluffy.jpg')
    })
  })

  it('shows placeholder image when imageUrl is not provided', async () => {
    // Mock cat without image
    server.use(
      http.get('/api/cats/:id', () => {
        return HttpResponse.json({
          ...mockCat,
          imageUrl: null,
        })
      })
    )

    renderWithRouter('1')

    await waitFor(() => {
      const image = screen.getByAltText('Fluffy')
      expect(image.getAttribute('src')).toMatch(/placeholder--cat.webp/)
    })
  })

  it('displays error message when cat is not found', async () => {
    renderWithRouter('999')

    await waitFor(() => {
      expect(screen.getByText(/cat not found/i)).toBeInTheDocument()
    })
  })

  it('displays error message when API call fails', async () => {
    renderWithRouter('500')

    await waitFor(() => {
      expect(screen.getByText(/failed to load cat/i)).toBeInTheDocument()
    })
  })

  it('has a back button that navigates to cats list', async () => {
    renderWithRouter('1')

    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back/i })
      expect(backButton).toBeInTheDocument()
    })
  })

  // Tests for conditional button rendering based on viewer permissions
  describe('Conditional button rendering', () => {
    it('shows only Back button when user has no edit permissions', async () => {
      renderWithRouter('1')

      await waitFor(() => {
        // Should show Back button
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()

        // Should NOT show Edit or My Cats buttons
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /my cats/i })).not.toBeInTheDocument()
      })
    })

    it('shows Edit and My Cats buttons when user has edit permissions', async () => {
      // Mock API to return cat with edit permissions
      server.use(
        http.get('/api/cats/:id', ({ params }) => {
          const { id } = params
          if (id === '1') {
            return HttpResponse.json(mockCatWithEditPermissions)
          }
          return HttpResponse.json({ message: 'Cat not found' }, { status: 404 })
        })
      )

      renderWithRouter('1')

      await waitFor(() => {
        // Should show all three buttons
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /my cats/i })).toBeInTheDocument()
      })
    })

    it('handles missing viewer_permissions gracefully', async () => {
      // Mock API to return cat without viewer_permissions
      server.use(
        http.get('/api/cats/:id', ({ params }) => {
          const { id } = params
          if (id === '1') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { viewer_permissions: _unused, ...catWithoutPermissions } = mockCat
            return HttpResponse.json(catWithoutPermissions)
          }
          return HttpResponse.json({ message: 'Cat not found' }, { status: 404 })
        })
      )

      renderWithRouter('1')

      await waitFor(() => {
        // Should show only Back button (no edit permissions)
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /my cats/i })).not.toBeInTheDocument()
      })
    })

    it('handles null can_edit permission', async () => {
      // Mock API to return cat with null can_edit
      server.use(
        http.get('/api/cats/:id', ({ params }) => {
          const { id } = params
          if (id === '1') {
            return HttpResponse.json({
              ...mockCat,
              viewer_permissions: {
                can_edit: null,
                can_view_contact: false,
              },
            })
          }
          return HttpResponse.json({ message: 'Cat not found' }, { status: 404 })
        })
      )

      renderWithRouter('1')

      await waitFor(() => {
        // Should show only Back button (null is falsy)
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /my cats/i })).not.toBeInTheDocument()
      })
    })
  })
})
