import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import LoginPage from './LoginPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'

// Fix ESM mocking: define mockNavigate at top scope
let mockNavigate: ReturnType<typeof vi.fn>
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate = vi.fn()
    // Mock email check endpoint
    server.use(
      http.post('http://localhost:3000/api/check-email', () => {
        return HttpResponse.json({
          data: {
            exists: true,
          },
        })
      })
    )
  })

  it('renders the login page correctly', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })
    // Password field should not be visible initially
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  it('logs in the user and navigates to / on success', async () => {
    server.use(
      http.post('http://localhost:8000/login', async ({ request }) => {
        const body = (await request.json()) as { email?: string; password?: string }
        if (body.email === 'test@example.com' && body.password === 'password123') {
          return HttpResponse.json({
            data: {
              access_token: 'mock-token',
              token_type: 'Bearer',
              email_verified: true,
            },
          })
        }
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      })
    )
    server.use(
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
        })
      })
    )
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    // Step 1: Enter email and click Next
    const emailInput = screen.getByLabelText(/email/i)
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Step 2: Enter password and click Login
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(loginButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('redirects authenticated users to /', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
      },
      route: '/login',
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows Google login button', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })
  })

  it('displays an error when query param is oauth_failed', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
      route: '/login?error=oauth_failed',
    })

    await waitFor(() => {
      expect(screen.getByTestId('login-error-message')).toHaveTextContent(
        /sign in failed/i // i18n key: auth:login.errors.oauth_failed
      )
    })
  })

  it('shows an error message on failed login', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    server.use(
      http.post('http://localhost:3000/login', () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      })
    )
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    // Step 1: Enter email and click Next
    await userEvent.type(screen.getByLabelText(/email/i), 'fail@example.com')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Step 2: Enter password and submit
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(async () => {
      // Error message is from i18n (auth:login.error)
      expect(await screen.findByTestId('login-error-message')).toBeInTheDocument()
    })
    vi.restoreAllMocks()
  })
})
