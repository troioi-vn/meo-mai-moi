import { renderWithRouter, screen, waitFor, userEvent } from '@/test-utils'
import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
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

  // Silence console noise across tests
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockClear()
    server.resetHandlers()

    // MSW handlers
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
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json(mockUser)
      }),
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

  // Wait until the form is ready for interaction
  const waitForFormToLoad = async () => {
    const nameInput = await screen.findByLabelText(/name/i)
    await waitFor(() => expect(nameInput).toHaveValue(mockCat.name))
    return { nameInput }
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
    const updatedName = 'Fluffy II'
    server.use(
      http.put('http://localhost:3000/api/cats/1', () => {
        return HttpResponse.json({ data: { ...mockCat, name: updatedName } })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    const { nameInput } = await waitForFormToLoad()
    await user.clear(nameInput)
    await user.type(nameInput, updatedName)
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
  })

  it('displays validation errors for empty required fields', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitForFormToLoad()
    await user.clear(screen.getByLabelText(/name/i))
    await user.clear(screen.getByLabelText(/breed/i))
    await user.clear(screen.getByLabelText(/birthday/i))
    await user.clear(screen.getByLabelText(/location/i))
    await user.clear(screen.getByLabelText(/description/i))

    // Submit via the visible button to mirror user behavior
    await user.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(screen.getByText('Name is required.')).toBeInTheDocument()
      expect(screen.getByText('Breed is required.')).toBeInTheDocument()
      expect(screen.getByText('Birthday is required.')).toBeInTheDocument()
      expect(screen.queryByText('Location is required.')).not.toBeInTheDocument()
      expect(screen.queryByText('Description is required.')).not.toBeInTheDocument()
    })
  })

  it('handles server errors during submission', async () => {
    server.use(
      http.put('http://localhost:3000/api/cats/1', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

  await waitForFormToLoad()
  await user.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update cat profile. Please try again.')
    })
  })

  it('redirects if user does not own the cat', async () => {
    mockUseParams.mockReturnValue({ id: '2' })
    renderComponent()
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You don't have permission to edit this cat.")
    })
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/')
    })
  // Ensure edit view is not present after redirect
  expect(screen.queryByRole('heading', { name: /edit cat profile/i })).not.toBeInTheDocument()
  })

  it('navigates to the cat list on cancel', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()
  // Ensure page is rendered before clicking cancel
  expect(await screen.findByRole('heading', { name: /edit cat profile/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  it('submits the form successfully when optional fields are empty', async () => {
    server.use(
      http.put('http://localhost:3000/api/cats/1', () => {
        return HttpResponse.json({ data: { ...mockCat, location: '', description: '' } })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

  await waitForFormToLoad()

    // Clear optional fields
    await user.clear(screen.getByLabelText(/location/i))
    await user.clear(screen.getByLabelText(/description/i))

    // Submit the form
    await user.click(screen.getByRole('button', { name: /update cat/i }))

    // Assert success
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat profile updated successfully!')
    })
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  it('shows a confirmation dialog and updates status to lost on confirm', async () => {
    server.use(
      http.put('http://localhost:3000/api/cats/1', async ({ request }) => {
        const data = (await request.json()) as { status?: string } | null
        expect(data?.status).toBe('lost')
        return HttpResponse.json({ data: { ...mockCat, status: 'lost' } })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

  await waitForFormToLoad()

    // Click the "Mark as Lost" button
    await user.click(screen.getByRole('button', { name: /mark as lost/i }))

    // Check that the dialog is open
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()

    // Confirm the dialog
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    // Assert success
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat status updated to LOST.')
    })
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })
})
