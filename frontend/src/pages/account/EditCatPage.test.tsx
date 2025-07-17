import { renderWithRouter, screen, waitFor, userEvent, fireEvent } from '@/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { toast } from 'sonner'
import { mockCat, anotherMockCat } from '@/mocks/data/cats'
import EditCatPage from '@/pages/account/EditCatPage'
import * as CatApi from '@/api/cats' // Import the entire module to mock getCat

// Mock the toast module
vi.mock('sonner')

// Mock react-router-dom hooks
const mockUseParams = vi.fn()
const mockUseNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockUseNavigate,
  }
})

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'cat_owner',
}

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
          return HttpResponse.json({ data: { ...mockCat, user_id: mockUser.id, viewer_permissions: { can_edit: true } } })
        }
        if (catId === '2') {
          return HttpResponse.json({ data: { ...anotherMockCat, user_id: 99, viewer_permissions: { can_edit: false } } })
        }
        return new HttpResponse(null, { status: 404 })
      })
    )

    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json(mockUser)
      }),
      // Removed http.get('/api/cats/:id') handler as getCat is now mocked directly
      http.get('http://localhost:3000/api/my-cats', () => {
        return HttpResponse.json([mockCat])
      })
    )
  })

  it('shows a loading spinner while fetching cat data', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    // Simulate a slow MSW response for /api/cats/1
    server.use(
      http.get('http://localhost:3000/api/cats/1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ data: { ...mockCat, user_id: mockUser.id, viewer_permissions: { can_edit: true } } })
      })
    )
    renderComponent()
    // The spinner should be present before the data loads
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    // Wait for the form to appear
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockCat.name)).toBeInTheDocument()
    })
  })

  // Helper to render the EditCatPage
  const renderComponent = () => {
    return renderWithRouter(<EditCatPage />)
  }

  it('loads and displays cat data in the form', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockCat.name)).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockCat.breed)).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockCat.birthday)).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockCat.location)).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockCat.description)).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveTextContent(/available/i)
    })
  })

  it('submits updated data and navigates on success', async () => {
    const updatedName = 'Fluffy II'
    server.use(
      http.put('http://localhost:3000/api/cats/1', async () => {
        return HttpResponse.json({ ...mockCat, name: updatedName })
      })
    )

    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), updatedName)
    await user.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Cat profile updated successfully!')
    })
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  it('displays validation errors for empty required fields', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/name/i))
    await user.clear(screen.getByLabelText(/breed/i))
    await user.clear(screen.getByLabelText(/birthday/i))
    await user.clear(screen.getByLabelText(/location/i))
    await user.clear(screen.getByLabelText(/description/i))

    await fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => {
      expect(screen.getByText('Name is required.')).toBeInTheDocument()
      expect(screen.getByText('Breed is required.')).toBeInTheDocument()
      expect(screen.getByText('Birthday is required.')).toBeInTheDocument()
      expect(screen.getByText('Location is required.')).toBeInTheDocument()
      expect(screen.getByText('Description is required.')).toBeInTheDocument()
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

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockCat.name)).toBeInTheDocument()
    })

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
  })

  it('navigates to the cat list on cancel', async () => {
    mockUseParams.mockReturnValue({ id: '1' })
    renderComponent()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit cat profile/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })
})
