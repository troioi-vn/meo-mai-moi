import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import RegisterPage from './RegisterPage'
import { toast } from 'sonner'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'
import { mockUser } from '@/mocks/data/user'

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useNavigate: () => navigate,
  }
})

vi.mock('sonner', async () => {
  const actual = await vi.importActual('sonner')
  return {
    ...(actual as object),
    toast: {
      success: vi.fn(),
    },
  }
})

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the settings endpoint to return open registration by default
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: false
          }
        })
      })
    )
  })

  it('renders the register page correctly in open registration mode', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
      expect(screen.getByText(/anyone can join our community/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })
  })

  it('renders waitlist form when invite-only mode is enabled without invitation code', async () => {
    // Mock invite-only mode
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /join the waitlist/i })).toBeInTheDocument()
      expect(screen.getByText(/we're currently invite-only/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
      
      // Should not show registration form fields
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/^Password$/i)).not.toBeInTheDocument()
    })
  })

  it('renders registration form when invite-only mode is enabled with valid invitation code', async () => {
    // Mock invite-only mode
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            inviter: {
              name: 'John Doe'
            },
            expires_at: null
          }
        })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register?invitation_code=valid-code-123' })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complete your registration/i })).toBeInTheDocument()
      expect(screen.getByText(/you have a valid invitation/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })
  })

  it('registers a new user and navigates to login on success', async () => {
    // Mock the register endpoint
    server.use(
      http.post('http://localhost:3000/api/register', async ({ request }) => {
        const data = await request.json()
        if (typeof data === 'object' && data !== null && 'email' in data) {
          if (data.email === mockUser.email) {
            return HttpResponse.json({ message: 'Email already taken.' }, { status: 422 })
          }
          return HttpResponse.json(
            { data: { access_token: 'mock-token', token_type: 'Bearer' } },
            { status: 201 }
          )
        }
        return HttpResponse.json({ message: 'Invalid request' }, { status: 400 })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register' })
    const user = userEvent.setup()

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/name/i), 'New User')
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('You are registered, now login please.')
    })

    // Assert navigation to /login
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows loading state while fetching settings', async () => {
    // Mock a delayed response
    server.use(
      http.get('http://localhost:3000/api/settings/public', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          data: {
            invite_only_enabled: false
          }
        })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register' })

    // Should show loading state initially
    expect(screen.getByText(/loading registration/i)).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    })
  })

  it('shows error state when settings fetch fails', async () => {
    // Mock a failed response
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(screen.getByText(/failed to load registration settings/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })
})
