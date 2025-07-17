
import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import MyCatsPage from './MyCatsPage'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('MyCatsPage', () => {
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
    )
  })

  it('renders the page title', async () => {
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return HttpResponse.json([])
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText('My Cats')).toBeInTheDocument()
    })
  })

  it("fetches and displays the user's cats", async () => {
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return HttpResponse.json([mockCat, anotherMockCat])
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
      expect(screen.getByText(anotherMockCat.name)).toBeInTheDocument()
    })
  })

  it('displays a loading message initially', async () => {
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        // Return a promise that never resolves to keep it in a loading state
        return new Promise(() => {})
      }),
    )
    renderWithRouter(<MyCatsPage />)

    // First, wait for the authentication loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText('Loading authentication status...')
      ).not.toBeInTheDocument()
    })

    // Now, check for the cats loading message
    expect(screen.getByText('Loading your cats...')).toBeInTheDocument()
  })

  it('displays an error message if fetching cats fails', async () => {
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(
        screen.getByText('Failed to fetch your cats. Please try again later.')
      ).toBeInTheDocument()
    })
  })

  it('has a button to create a new cat and navigates on click', async () => {
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return HttpResponse.json([])
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /new cat/i })
      expect(button).toBeInTheDocument()
    })
    // Click the button and assert navigation
    await userEvent.click(screen.getByRole('button', { name: /new cat/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/account/cats/create')
  })

  describe('Show All Switch', () => {
    it('renders the switch to show all cats including deceased', async () => {
      server.use(
        http.get('http://localhost:3000/api/my-cats', () => {
          return HttpResponse.json([])
        }),
      )
      renderWithRouter(<MyCatsPage />)

      await waitFor(() => {
        expect(screen.getByRole('switch')).toBeInTheDocument()
        expect(screen.getByText('Show all (including deceased)')).toBeInTheDocument()
      })
    })

    it('filters out dead cats by default', async () => {
      server.use(
        http.get('http://localhost:3000/api/my-cats', () => {
          return HttpResponse.json([
            { ...mockCat, name: 'Alive Cat', status: 'alive' },
            { ...anotherMockCat, name: 'Dead Cat', status: 'dead' },
          ])
        }),
      )

      renderWithRouter(<MyCatsPage />)

      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.queryByText('Dead Cat')).not.toBeInTheDocument()
      })
    })

    it('shows dead cats when switch is toggled on', async () => {
      const user = userEvent.setup()
      server.use(
        http.get('http://localhost:3000/api/my-cats', () => {
          return HttpResponse.json([
            { ...mockCat, name: 'Alive Cat', status: 'alive' },
            { ...anotherMockCat, name: 'Dead Cat', status: 'dead' },
          ])
        }),
      )

      renderWithRouter(<MyCatsPage />)

      // Initially dead cat should not be visible
      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.queryByText('Dead Cat')).not.toBeInTheDocument()
      })

      // Toggle the switch
      const switchElement = screen.getByRole('switch')
      await user.click(switchElement)

      // Now dead cat should be visible
      await waitFor(() => {
        expect(screen.getByText('Alive Cat')).toBeInTheDocument()
        expect(screen.getByText('Dead Cat')).toBeInTheDocument()
      })
    })
  })
})
