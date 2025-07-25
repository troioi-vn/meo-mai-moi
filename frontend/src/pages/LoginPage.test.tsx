import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import LoginPage from '../pages/LoginPage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

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
  })

  it('renders the login page correctly', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })
  })

  it('logs in the user and navigates to /account/cats on success', async () => {
    server.use(
      http.post('http://localhost:8000/api/login', async ({ request }) => {
        const body = (await request.json()) as { email?: string; password?: string }
        if (body.email === 'test@example.com' && body.password === 'password123') {
          return HttpResponse.json({ data: { access_token: 'mock-token' } })
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
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(loginButton)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account')
    })
  })

  it('redirects authenticated users to /account', async () => {
    renderWithRouter(<LoginPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
      },
      route: '/login',
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account')
    })
  })

  it('shows an error message on failed login', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    server.use(
      http.post('http://localhost:3000/api/login', () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      })
    )
    renderWithRouter(<LoginPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })
    await userEvent.type(screen.getByLabelText(/email/i), 'fail@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /login/i }))
    await waitFor(async () => {
      expect(await screen.findByTestId('login-error-message')).toHaveTextContent(
        'Failed to login. Please check your credentials.'
      )
    })
    vi.restoreAllMocks()
  })
})
