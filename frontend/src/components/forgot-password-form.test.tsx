import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import { ForgotPasswordForm } from '../components/forgot-password-form'

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
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument()
  })

  it('handles form submission correctly', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.click(submitButton)

    // Should show loading state
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()

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
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

    await userEvent.type(emailInput, 'user@example.com')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/we've sent password reset instructions to user@example.com/i)
      ).toBeInTheDocument()
    })
  })

  it('allows trying again from success state', async () => {
    renderWithRouter(<ForgotPasswordForm />)

    // Submit form
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset instructions/i })

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
})
