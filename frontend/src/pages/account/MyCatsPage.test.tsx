
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
      http.get('http://localhost:3000/api/cats', () => {
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
      http.get('http://localhost:3000/api/cats', () => {
        return HttpResponse.json([mockCat, anotherMockCat])
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText(mockCat.name)).toBeInTheDocument()
      expect(screen.getByText(anotherMockCat.name)).toBeInTheDocument()
    })
  })

  it('displays a loading message initially', () => {
    renderWithRouter(<MyCatsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays an error message if fetching cats fails', async () => {
    server.use(
      http.get('http://localhost:3000/api/cats', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )
    renderWithRouter(<MyCatsPage />)
    await waitFor(() => {
      expect(screen.getByText(/error fetching cats/i)).toBeInTheDocument()
    })
  })

  it('has a button to create a new cat and navigates on click', async () => {
    const navigate = vi.fn()
    ;(useNavigate as unknown as () => typeof navigate).mockReturnValue(navigate)

    renderWithRouter(<MyCatsPage />)
    const newCatButton = screen.getByRole('button', { name: /new cat/i })
    await userEvent.click(newCatButton)
    expect(navigate).toHaveBeenCalledWith('/account/cats/new')
  })

  describe('Show All Switch', () => {
    it('renders the switch to show all cats including deceased', () => {
      renderWithRouter(<MyCatsPage />)
      expect(screen.getByLabelText(/show all/i)).toBeInTheDocument()
    })

    it('filters out dead cats by default', async () => {
      server.use(
        http.get('http://localhost:3000/api/cats', () => {
          return HttpResponse.json({ data: [mockCat, deceasedMockCat] })
        }),
      )
      renderWithRouter(<MyCatsPage />)

      await waitFor(() => {
        expect(screen.getByText(mockCat.name)).toBeInTheDocument()
        expect(screen.queryByText(deceasedMockCat.name)).not.toBeInTheDocument()
      })
    })

    it('shows dead cats when switch is toggled on', async () => {
      server.use(
        http.get('http://localhost:3000/api/cats', () => {
          return HttpResponse.json({ data: [mockCat, deceasedMockCat] })
        }),
      )
      renderWithRouter(<MyCatsPage />)

      // Initially dead cat should not be visible
      await waitFor(() => {
        expect(screen.getByText(mockCat.name)).toBeInTheDocument()
        expect(screen.queryByText(deceasedMockCat.name)).not.toBeInTheDocument()
      })

      // Toggle the switch
      const showAllSwitch = screen.getByLabelText(/show all/i)
      await userEvent.click(showAllSwitch)

      // Now dead cat should be visible
      await waitFor(() => {
        expect(screen.getByText(mockCat.name)).toBeInTheDocument()
        expect(screen.getByText(deceasedMockCat.name)).toBeInTheDocument()
      })
    })
  })
  })
