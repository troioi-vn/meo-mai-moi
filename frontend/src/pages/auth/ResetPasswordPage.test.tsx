import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import ResetPasswordPage from './ResetPasswordPage'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock sonner
vi.mock('sonner', () => ({
  __esModule: true,
  Toaster: () => null,
  default: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResetPasswordPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('shows loading state while validating token', async () => {
    // Provide a handler to avoid unhandled request errors while the component is in loading state
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', async () => {
        // small delay to keep the component in "validating" state for this test
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    expect(screen.getByRole('heading', { name: /validating reset link/i })).toBeInTheDocument()
  })

  it('shows reset form after successful token validation', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      // Title from i18n is "Reset your password"
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^confirm (?:new )?password$/i)).toBeInTheDocument()
    })
  })

  it('shows error for invalid token', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({ message: 'Invalid or expired reset token.' }, { status: 422 })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/invalid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument()
      expect(screen.getByText(/invalid or expired reset token/i)).toBeInTheDocument()
    })
  })

  it('shows error for missing email parameter', async () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?error=missing_email'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument()
      expect(screen.getByText(/email parameter is missing/i)).toBeInTheDocument()
    })
  })

  it('successfully resets password', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      }),
      http.post('http://localhost:3000/api/password/reset', () => {
        return HttpResponse.json({
          data: {
            message: 'Password reset successfully',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      // Title from i18n is "Reset your password"
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^new password$/i), 'newpassword123')
    await user.type(screen.getByLabelText(/^confirm (?:new )?password$/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /password reset successfully/i })
      ).toBeInTheDocument()
      expect(screen.getByText(/you can now login with your new password/i)).toBeInTheDocument()
    })
  })

  it('shows error for mismatched passwords', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      // Title from i18n is "Reset your password"
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^new password$/i), 'password1')
    await user.type(screen.getByLabelText(/^confirm (?:new )?password$/i), 'password2')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })

  it('shows error for short password', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      // Title from i18n is "Reset your password"
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/^new password$/i), '123')
    await user.type(screen.getByLabelText(/^confirm (?:new )?password$/i), '123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    server.use(
      http.get('http://localhost:3000/api/password/reset/:token', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            email: 'test@example.com',
          },
        })
      })
    )

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/password/reset/valid-token?email=test@example.com'],
      routes: [{ path: '/password/reset/:token', element: <ResetPasswordPage /> }],
    })

    await waitFor(() => {
      // Title from i18n is "Reset your password"
      expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument()
    })

    const passwordInput = screen.getByLabelText(/^new password$/i)
    const toggleButton = passwordInput.parentElement?.querySelector('button')

    expect(passwordInput).toHaveAttribute('type', 'password')

    if (toggleButton) {
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')
    }
  })
})
