import { renderWithRouter, screen, waitFor, userEvent, fireEvent } from '@/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { toast } from 'sonner'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import { mockUser } from '@/mocks/data/user'
import EditCatPage from '@/pages/account/EditCatPage'

// Mock the toast module
vi.mock('sonner')

// Mock react-router-dom hooks
const mockUseParams = vi.fn()
const mockUseNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: () => mockUseParams() as { id: string },
    useNavigate: () => mockUseNavigate,
  }
})

describe('EditCatPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockClear()

    // MSW handler for /api/cats/:id (getCat)
    server.use(
      http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
        const catId = String(params.id)
        if (catId === '1') {
          return HttpResponse.json(
            { data: { ...mockCat, user_id: mockUser.id, viewer_permissions: { can_edit: true } } },
            { headers: { 'Content-Type': 'application/json' } }
          )
        }
        if (catId === '2') {
          return HttpResponse.json(
            { data: { ...anotherMockCat, user_id: 99, viewer_permissions: { can_edit: false } } },
            { headers: { 'Content-Type': 'application/json' } }
          )
        }
        return new HttpResponse(null, { status: 404 })
      })
    )

    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json(mockUser)
      }),
      // Removed http.get('/api/cats/:id') handler as getCat is now mocked directly
      http.get('http://localhost:3000/api/cats', () => {
        return HttpResponse.json([mockCat])
      })
    )
  })

  // it('shows a loading spinner while fetching cat data', async () => {
  //   mockUseParams.mockReturnValue({ id: '1' })
  //   // Simulate a slow MSW response for /api/cats/1
  //   server.use(
  //     http.get('http://localhost:3000/api/cats/1', async () => {
  //       await new Promise((resolve) => setTimeout(resolve, 100))
  //       return HttpResponse.json(
  //         { data: { ...mockCat, user_id: mockUser.id, viewer_permissions: { can_edit: true } } },
  //         { headers: { 'Content-Type': 'application/json' } }
  //       )
  //     })
  //   )
  //   renderComponent()
  //   // The spinner should be present before the data loads
  //   expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  //   // Wait for the form to appear
  //   await waitFor(async () => {
  //     expect(await screen.findByDisplayValue(mockCat.name)).toBeInTheDocument()
  //   })
  // })

  // Helper to render the EditCatPage
  const renderComponent = () => {
    return renderWithRouter(<EditCatPage />, {
      initialAuthState: { user: mockUser, isAuthenticated: true, isLoading: false },
    })
  }

  // it('loads and displays cat data in the form', async () => {
  //   mockUseParams.mockReturnValue({ id: '1' })
  //   renderComponent()

  //   await waitFor(async () => {
  //     expect(await screen.findByDisplayValue(mockCat.name)).toBeInTheDocument()
  //     expect(await screen.findByDisplayValue(mockCat.breed)).toBeInTheDocument()
  //     expect(await screen.findByDisplayValue(mockCat.birthday)).toBeInTheDocument()
  //     expect(await screen.findByDisplayValue(mockCat.location)).toBeInTheDocument()
  //     expect(await screen.findByDisplayValue(mockCat.description)).toBeInTheDocument()
  //     expect(await screen.findByRole('combobox')).toHaveTextContent(/active/i)
  //   })
  // })

  it('submits updated data and navigates on success', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {
      /* empty */
    })
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    const updatedName = 'Fluffy II'
    server.use(
      http.put('http://localhost:3000/api/cats/1', () => {
        return HttpResponse.json({ data: { ...mockCat, name: updatedName } })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(async () => {
      expect(await screen.findByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), updatedName)
    await user.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(
      () => {
        expect(toast.success).toHaveBeenCalledWith('Cat profile updated successfully!')
      },
      { timeout: 5000 }
    )
    await waitFor(
      () => {
        expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
      },
      { timeout: 5000 }
    )
    vi.restoreAllMocks()
  })

  it('displays validation errors for empty required fields', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {
      /* empty */
    })
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(async () => {
      expect(await screen.findByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/name/i))
    await user.clear(screen.getByLabelText(/breed/i))
    await user.clear(screen.getByLabelText(/birthday/i))
    await user.clear(screen.getByLabelText(/location/i))
    await user.clear(screen.getByLabelText(/description/i))

    fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => {
      expect(screen.getByText('Name is required.')).toBeInTheDocument()
      expect(screen.getByText('Breed is required.')).toBeInTheDocument()
      expect(screen.getByText('Birthday is required.')).toBeInTheDocument()
      expect(screen.getByText('Location is required.')).toBeInTheDocument()
      expect(screen.getByText('Description is required.')).toBeInTheDocument()
    })
    vi.restoreAllMocks()
  })

  it('handles server errors during submission', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    vi.spyOn(console, 'log').mockImplementation(() => {
      /* empty */
    })
    server.use(
      http.put('http://localhost:3000/api/cats/1', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(async () => {
      expect(await screen.findByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update cat profile. Please try again.')
    })
    vi.restoreAllMocks()
  })

  it('redirects if user does not own the cat', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    mockUseParams.mockReturnValue({ id: '2' })
    renderComponent()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You don't have permission to edit this cat.")
    })
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/')
    })
    vi.restoreAllMocks()
  })

  it('navigates to the cat list on cancel', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()
    await waitFor(async () => {
      expect(await screen.findByRole('heading', { name: /edit cat profile/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })
})
