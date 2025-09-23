import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'

// Fix ESM mocking: define mockNavigate at top scope
let mockNavigate: ReturnType<typeof vi.fn>
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    mockNavigate = vi.fn()
  })

  it('renders the forgot password page correctly', async () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument()
      expect(screen.getByText(/remember your password/i)).toBeInTheDocument()
    })
  })

  it('shows success message after submitting email', async () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      expect(
        screen.getByText(/we've sent password reset instructions to test@example.com/i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })
  })

  it('navigates back to login when "Back to login" is clicked', async () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    const backToLoginLink = screen.getByText(/back to login/i)
    await userEvent.click(backToLoginLink)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('redirects authenticated users to /account/cats', async () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialAuthState: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
      },
      route: '/forgot-password',
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
    })
  })

  it('allows trying again after success message', async () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialAuthState: { user: null, isLoading: false, isAuthenticated: false },
    })

    // Submit the form first
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitButton)

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    })

    // Click "Try again"
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(tryAgainButton)

    // Should be back to the form
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })
  })
})
