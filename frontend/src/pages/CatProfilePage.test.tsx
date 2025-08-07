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

vi.mock('@/components/PlacementRequestModal', () => ({
  PlacementRequestModal: () => <div>PlacementRequestModal</div>,
}));

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
      }),
      http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
        const { id } = params
        if (id === String(mockCat.id)) {
          return HttpResponse.json({ data: { ...mockCat, viewer_permissions: { can_edit: true } } })
        }
        if (id === String(anotherMockCat.id)) {
          return HttpResponse.json({ data: anotherMockCat })
        }
        return new HttpResponse(null, { status: 404 })
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
    await waitFor(async () => {
      expect(await screen.findByText(mockCat.name)).toBeInTheDocument()
    })

    // Check all cat information is displayed
    expect(await screen.findByText(/persian/i, { exact: false })).toBeInTheDocument()
    // Note: Age calculation might be brittle. Consider mocking the date or testing the age calculation separately.
    expect(await screen.findByText(/years old/)).toBeInTheDocument()
    expect(await screen.findByText(mockCat.location)).toBeInTheDocument()
    expect(await screen.findByText(mockCat.description)).toBeInTheDocument()
    const statusElement = await screen.findByText(/status/i)
    expect(statusElement).toBeInTheDocument()
    const statusValue = statusElement.nextElementSibling
    expect(statusValue).toHaveTextContent(new RegExp(mockCat.status, 'i'))
  })

  it('displays cat image with correct alt text', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: `/cats/${String(mockCat.id)}` }
    )

    await waitFor(async () => {
      const image = await screen.findByAltText(mockCat.name)
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

    await waitFor(async () => {
      const image = await screen.findByAltText(anotherMockCat.name)
      expect(image.getAttribute('src')).toMatch(/placeholder--cat.webp/)
    })
  })

  it('displays an error message when the cat is not found', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
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

    await waitFor(async () => {
      expect(await screen.findByText(/cat not found/i)).toBeInTheDocument()
    })
    vi.restoreAllMocks()
  })

  it('displays a generic error message on server failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
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

    await waitFor(async () => {
      expect(await screen.findByText(/failed to load cat information/i)).toBeInTheDocument()
    })
    vi.restoreAllMocks()
  })

  describe('Conditional button rendering', () => {
    

    it('shows Edit and My Cats buttons when user has edit permissions', async () => {
      renderWithRouter(
        <Routes>
          <Route path="/cats/:id" element={<CatProfilePage />} />
        </Routes>,
        { route: `/cats/${String(mockCat.id)}` }
      )

      await waitFor(async () => {
        // Should show all three buttons
        expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument()
        expect(await screen.findByRole('button', { name: /my cats/i })).toBeInTheDocument()
      })

      // Click Edit and assert navigation
      screen.getByRole('button', { name: /edit/i }).click()
      expect(mockNavigate).toHaveBeenCalledWith(`/cats/${String(mockCat.id)}/edit`)

      // Click My Cats and assert navigation
      screen.getByRole('button', { name: /my cats/i }).click()
      expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  describe('Responses section', () => {
    it('shows the responses section when the user is the owner', async () => {
      const catWithResponses = {
        ...mockCat,
        viewer_permissions: { can_edit: true },
        placement_requests: [
          {
            id: 1,
            request_type: 'foster',
            transfer_requests: [
              {
                id: 1,
                helper_profile: {
                  id: 1,
                  user: { name: 'Helper One' },
                },
              },
            ],
          },
        ],
      };

      server.use(
        http.get(`http://localhost:3000/api/cats/${String(catWithResponses.id)}`, () => {
          return HttpResponse.json({ data: catWithResponses })
        })
      )

      renderWithRouter(
        <Routes>
          <Route path="/cats/:id" element={<CatProfilePage />} />
        </Routes>,
        { route: `/cats/${String(catWithResponses.id)}` }
      )

      await waitFor(async () => {
        expect(await screen.findByText('Responses for FOSTER')).toBeInTheDocument()
        expect(await screen.findByText('Helper One')).toBeInTheDocument()
      })
    })
  })
})
