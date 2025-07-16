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
}

const server = setupServer(
  http.get('/api/cats/:id', ({ params }) => {
    const { id } = params
    if (id === '1') {
      return HttpResponse.json(mockCat)
    }
    if (id === '999') {
      return HttpResponse.json(
        { message: 'Cat not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(
      { message: 'Failed to fetch cat' },
      { status: 500 }
    )
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
    expect(screen.getByText('A very friendly and fluffy cat who loves to play and cuddle.')).toBeInTheDocument()
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
      const backButton = screen.getByRole('button', { name: /back to cats/i })
      expect(backButton).toBeInTheDocument()
    })
  })
})
