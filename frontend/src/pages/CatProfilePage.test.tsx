import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import CatProfilePage from './CatProfilePage'
import { Routes, Route } from 'react-router-dom'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { useCatProfile } from '@/hooks/useCatProfile' // Import useCatProfile

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
}))

// Mock useCatProfile hook
vi.mock('@/hooks/useCatProfile')

describe('CatProfilePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    // Default mock for useCatProfile to return mockCat
    vi.mocked(useCatProfile).mockReturnValue({
      cat: mockCat,
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

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

    // No loading state expected due to mock
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()

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
    // Mock useCatProfile to return a cat without a photo
    vi.mocked(useCatProfile).mockReturnValue({
      cat: { ...anotherMockCat, photo_url: undefined },
      loading: false,
      error: null,
      refresh: vi.fn(),
    })

    renderWithRouter(
      <Routes>
        <Route path="/cats/:id" element={<CatProfilePage />} />
      </Routes>,
      { route: `/cats/${String(anotherMockCat.id)}` }
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
    // Mock useCatProfile to return an error for 404
    vi.mocked(useCatProfile).mockReturnValue({
      cat: null,
      loading: false,
      error: 'Cat not found',
      refresh: vi.fn(),
    })

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
    // Mock useCatProfile to return a generic error
    vi.mocked(useCatProfile).mockReturnValue({
      cat: null,
      loading: false,
      error: 'Failed to load cat information',
      refresh: vi.fn(),
    })

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

      // Should show the buttons
      expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(await screen.findByRole('button', { name: /my cats/i })).toBeInTheDocument()

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
      server.use(
        http.get(`http://localhost:3000/api/cats/${String(mockCat.id)}`, () => {
          return HttpResponse.json({ data: { ...mockCat, viewer_permissions: { can_edit: true } } })
        })
      )

      renderWithRouter(
        <Routes>
          <Route path="/cats/:id" element={<CatProfilePage />} />
        </Routes>,
        { route: `/cats/${String(mockCat.id)}` }
      )

      await waitFor(async () => {
        expect(await screen.findByText('Active Placement Requests')).toBeInTheDocument()
        expect(await screen.findByText('FOSTERING')).toBeInTheDocument()
        expect(await screen.findByText('Helper One')).toBeInTheDocument()
      })
    })
  })
})
