import { screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import RegisterPage from './RegisterPage'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'

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
            invite_only_enabled: false,
          },
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

  it('shows the Google login button on the register page', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect'
    )
  })

  it('includes invitation_code on Google login button on register page', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register?invitation_code=CODE123' })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect?invitation_code=CODE123'
    )
  })

  it('renders waitlist form when invite-only mode is enabled without invitation code', async () => {
    // Mock invite-only mode
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true,
          },
        })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register' })

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /join the waitlist/i })
      ).toBeInTheDocument()
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
            invite_only_enabled: true,
          },
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            inviter: {
              name: 'John Doe',
            },
            expires_at: null,
          },
        })
      })
    )

    renderWithRouter(<RegisterPage />, { route: '/register?invitation_code=valid-code-123' })

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /complete your registration/i })
      ).toBeInTheDocument()
      expect(screen.getByText(/you have a valid invitation/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })
  })

  it('registers a new user and shows email verification prompt', async () => {
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

    // Should show email verification prompt instead of navigating
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
      expect(screen.getByText(/we have sent you verification email/i)).toBeInTheDocument()
    })

    // Should not navigate to login
    expect(navigate).not.toHaveBeenCalledWith('/login')
  })

  it('shows appropriate message when email sending fails', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register' })
    const user = userEvent.setup()

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/name/i), 'New User')
    await user.type(screen.getByLabelText(/email/i), 'no-email@example.com') // This triggers email send failure
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    // Should show email verification prompt with failure message
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
      expect(screen.getByText(/unable to send verification email/i)).toBeInTheDocument()
      expect(screen.getByText(/hopefully admins are working on it/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching settings', async () => {
    // Mock a delayed response
    server.use(
      http.get('http://localhost:3000/api/settings/public', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({
          data: {
            invite_only_enabled: false,
          },
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

  it('clears verification prompt and shows registration form when "Use another email" is clicked', async () => {
    renderWithRouter(<RegisterPage />, { route: '/register' })
    const user = userEvent.setup()

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    })

    // Register a user
    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    // Should show email verification prompt
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
    })

    // Click "Use another email" button to open the confirmation dialog
    const triggerButton = screen.getByRole('button', { name: /use another email/i })
    fireEvent.click(triggerButton)

    // Wait for alertdialog to appear
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    // Click the action button inside the dialog
    const actionButton = screen.getByRole('button', { name: /use another email/i })
    fireEvent.click(actionButton)

    // Should navigate back to register page and show registration form
    // The logout will set user to null, which triggers the useEffect to clear registrationResponse
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      // Verification prompt should be gone
      expect(screen.queryByRole('heading', { name: /verify your email/i })).not.toBeInTheDocument()
    })
  })
})
