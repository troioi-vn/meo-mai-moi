import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import CatProfilePage from './CatProfilePage'
import { Routes, Route } from 'react-router-dom'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CatProfilePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      })
    )
  })

  it('renders cat profile information correctly', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: `/cats/${String(mockCat.id)}` }
    )

    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for cat data to load
    await waitFor(() => {
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
    })

    // Check all cat information is displayed
    expect(screen.getByText(/persian/i, { exact: false })).toBeInTheDocument()
    // Note: Age calculation might be brittle. Consider mocking the date or testing the age calculation separately.
    expect(screen.getByText(/years old/)).toBeInTheDocument()
    expect(screen.getByText(mockCat.location)).toBeInTheDocument()
    expect(screen.getByText(mockCat.description)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(mockCat.status, 'i'))).toBeInTheDocument()
  })

  it('displays cat image with correct alt text', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: `/cats/${String(mockCat.id)}` }
    )

    await waitFor(() => {
      const image = screen.getByAltText(mockCat.name)
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute('src', mockCat.photo_url)
    })
  })

  it('shows placeholder image when imageUrl is not provided', async () => {
    const catWithoutPhoto = { ...anotherMockCat, photo_url: null }
    server.use(
      http.get(`http://localhost:3000/api/cats/${String(catWithoutPhoto.id)}`, () => {
        return HttpResponse.json({ data: catWithoutPhoto })
      })
    )
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: `/cats/${String(catWithoutPhoto.id)}` }
    )

    await waitFor(() => {
      const image = screen.getByAltText(anotherMockCat.name)
      expect(image.getAttribute('src')).toMatch(/placeholder--cat.webp/)
    })
  })

  it('displays an error message when the cat is not found', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/999', () => {
        return new HttpResponse(null, { status: 404 })
      })
    )
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: '/cats/999' }
    )

    await waitFor(() => {
      expect(screen.getByText(/cat not found/i)).toBeInTheDocument()
    })
  })

  it('displays a generic error message on server failure', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats/1', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: '/cats/1' }
    )

    await waitFor(() => {
      expect(screen.getByText(/failed to load cat information/i)).toBeInTheDocument()
    })
  })

  describe('Conditional button rendering', () => {
    it("shows only Back button when user doesn't have edit permissions", async () => {
      const catWithoutPerms = {
        ...anotherMockCat,
        viewer_permissions: { can_edit: false, can_view_contact: false },
      }
      server.use(
        http.get(`http://localhost:3000/api/cats/${String(catWithoutPerms.id)}`, () => {
          return HttpResponse.json({ data: catWithoutPerms })
        })
      )
      renderWithRouter(
        <Routes>
          <Route path="/cats/:id" element={<CatProfilePage />} />
        </Routes>,
        { route: `/cats/${String(catWithoutPerms.id)}` }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      })

      // Click Back and assert navigation
      screen.getByRole('button', { name: /back/i }).click()
      expect(mockNavigate).toHaveBeenCalledWith('/')

      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /my cats/i })).not.toBeInTheDocument()
    })

    it('shows Edit and My Cats buttons when user has edit permissions', async () => {
      renderWithRouter(
        <Routes>
          <Route path="/cats/:id" element={<CatProfilePage />} />
        </Routes>,
        { route: `/cats/${String(mockCat.id)}` }
      )

      await waitFor(() => {
        // Should show all three buttons
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /my cats/i })).toBeInTheDocument()
      })

      // Click Edit and assert navigation
      screen.getByRole('button', { name: /edit/i }).click()
      expect(mockNavigate).toHaveBeenCalledWith(`/cats/${String(mockCat.id)}/edit`)

      // Click My Cats and assert navigation
      screen.getByRole('button', { name: /my cats/i }).click()
      expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })
})
