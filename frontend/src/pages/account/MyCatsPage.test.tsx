import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import MyCatsPage from './MyCatsPage'
import { mockCat, anotherMockCat, deceasedMockCat } from '@/mocks/data/cats'
import { HttpResponse, http } from 'msw'
import { server } from '@/mocks/server'
import { mockUser } from '@/mocks/data/user'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await import('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('MyCatsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return HttpResponse.json({ data: [mockCat, anotherMockCat, deceasedMockCat] })
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({ data: mockUser })
      })
    )
  })

  it('renders the page title', async () => {
    renderWithRouter(<MyCatsPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    })
    expect(await screen.findByText('My Cats')).toBeInTheDocument()
  })

  it("fetches and displays the user's cats", async () => {
    renderWithRouter(<MyCatsPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    })
    expect(await screen.findByText(mockCat.name)).toBeInTheDocument()
    expect(await screen.findByText(anotherMockCat.name)).toBeInTheDocument()
  })

  it('displays an error message if fetching cats fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    server.use(
      http.get('http://localhost:3000/api/my-cats', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    renderWithRouter(<MyCatsPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    })
    expect(
      await screen.findByText('Failed to fetch your cats. Please try again later.')
    ).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('has a button to create a new cat and navigates on click', async () => {
    renderWithRouter(<MyCatsPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    })
    const newCatButton = await screen.findByRole('button', { name: /new cat/i })
    await userEvent.click(newCatButton)
    expect(mockNavigate).toHaveBeenCalledWith('/account/cats/create')
  })

  describe('Show All Switch', () => {
    it('renders the switch to show all cats including deceased', async () => {
      renderWithRouter(<MyCatsPage />, {
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })
      expect(await screen.findByLabelText(/show all/i)).toBeInTheDocument()
    })

    it('filters out dead cats by default', async () => {
      server.use(
        http.get('http://localhost:3000/api/my-cats', () => {
          return HttpResponse.json({ data: [mockCat, deceasedMockCat] })
        })
      )
      renderWithRouter(<MyCatsPage />, {
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      await waitFor(async () => {
        expect(await screen.findByText(mockCat.name)).toBeInTheDocument()
        expect(screen.queryByText(deceasedMockCat.name)).not.toBeInTheDocument()
      })
    })

    it('shows dead cats when switch is toggled on', async () => {
      server.use(
        http.get('http://localhost:3000/api/my-cats', () => {
          return HttpResponse.json({ data: [mockCat, deceasedMockCat] })
        })
      )
      renderWithRouter(<MyCatsPage />, {
        initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
      })

      // Initially dead cat should not be visible
      await waitFor(async () => {
        expect(await screen.findByText(mockCat.name)).toBeInTheDocument()
        expect(screen.queryByText(deceasedMockCat.name)).not.toBeInTheDocument()
      })

      // Toggle the switch
      const showAllSwitch = await screen.findByLabelText(/show all/i)
      await userEvent.click(showAllSwitch)

      // Now dead cat should be visible
      await waitFor(async () => {
        expect(await screen.findByText(mockCat.name)).toBeInTheDocument()
        expect(await screen.findByText(deceasedMockCat.name)).toBeInTheDocument()
      })
    })
  })
})
