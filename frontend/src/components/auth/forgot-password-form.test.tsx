import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import { ForgotPasswordForm } from './forgot-password-form'

// Mock toast
vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>()
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

let mockNavigate: ReturnType<typeof vi.fn>
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    mockNavigate = vi.fn()
  })

  it('renders the form correctly', () => {
    renderWithRouter(<ForgotPasswordForm />)

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(
      screen.getByText(/enter your email address and we'll send you a link/i)
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    // Button text is "Send Reset Link" from i18n
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('handles form submission correctly', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitButton)

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    })
  })

  it('navigates to login when back to login is clicked', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    const backToLoginLink = screen.getByText(/back to login/i)
    await userEvent.click(backToLoginLink)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('shows success state with correct email', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await userEvent.type(emailInput, 'user@example.com')
    await userEvent.click(submitButton)

    await waitFor(() => {
      // The success message uses Trans component with interpolation
      expect(screen.getByText(/user@example.com/)).toBeInTheDocument()
    })
  })

  it('allows trying again from success state', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    // Submit form
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitButton)

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    // Click try again
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(tryAgainButton)

    // Should be back to form
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('shows a notification when email is not found', async () => {
    const { toast } = await import('sonner')
    renderWithRouter(<ForgotPasswordForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await userEvent.type(emailInput, 'unknown@example.com')
    await userEvent.click(submitButton)

    await waitFor(() => {
      // Toast uses raw error message from server when it's not an i18n key
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
