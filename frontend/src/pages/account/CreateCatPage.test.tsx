import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import CreateCatPage from './CreateCatPage'
import MyCatsPage from './MyCatsPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'

// Mock the useAuth hook to return an authenticated user
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 1, name: 'Test User', role: 'cat_owner' },
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/account/cats/create']}>
      <AuthProvider>
        <Routes>
          <Route path="/account/cats/create" element={ui} />
          <Route path="/account/cats" element={<MyCatsPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('CreateCatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form fields with birthday instead of age', () => {
    renderWithProviders(<CreateCatPage />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Breed')).toBeInTheDocument()
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument()
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()

    // Should NOT have age field
    expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()
  })

  it('renders cancel button that navigates back to my cats page', () => {
    renderWithProviders(<CreateCatPage />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('submits the form with birthday and redirects on success', async () => {
    const user = userEvent.setup()

    // Mock the API response
    server.use(
      http.post('/api/cats', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Fluffy',
          breed: 'Persian',
          birthday: '2023-01-01',
          location: 'New York',
          description: 'A very cute cat',
          user_id: 1,
          status: 'available',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        })
      })
    )

    renderWithProviders(<CreateCatPage />)

    await user.type(screen.getByLabelText('Name'), 'Fluffy')
    await user.type(screen.getByLabelText('Breed'), 'Persian')
    await user.type(screen.getByLabelText('Birthday'), '2023-01-01')
    await user.type(screen.getByLabelText('Location'), 'New York')
    await user.type(screen.getByLabelText('Description'), 'A very cute cat')

    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  it('displays validation errors for empty required fields', async () => {
    const user = userEvent.setup()

    renderWithProviders(<CreateCatPage />)

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/breed is required/i)).toBeInTheDocument()
      expect(screen.getByText(/birthday is required/i)).toBeInTheDocument()
    })
  })

  it('navigates back to my cats page when cancel button is clicked', async () => {
    const user = userEvent.setup()

    renderWithProviders(<CreateCatPage />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
  })

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup()

    // Mock API error
    server.use(
      http.post('/api/cats', () => {
        return HttpResponse.json({ message: 'Failed to create cat' }, { status: 500 })
      })
    )

    renderWithProviders(<CreateCatPage />)

    // Fill out the form completely so validation passes
    await user.type(screen.getByLabelText('Name'), 'Fluffy')
    await user.type(screen.getByLabelText('Breed'), 'Persian')
    await user.type(screen.getByLabelText('Birthday'), '2023-01-01')
    await user.type(screen.getByLabelText('Location'), 'New York')
    await user.type(screen.getByLabelText('Description'), 'A very cute cat')

    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Create Cat' }))

    await waitFor(() => {
      // Check for the form error message (not the toast)
      expect(screen.getByTestId('form-error')).toHaveTextContent(/failed to create cat/i)
    })
  })
})
