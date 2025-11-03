import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import EmailVerificationPrompt from './EmailVerificationPrompt'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

describe('EmailVerificationPrompt', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Ensure resend cooldown/attempt state does not leak across tests
    localStorage.clear()
  })

  it('renders the email verification prompt correctly', async () => {
    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
      expect(screen.getByText(/please verify your email address/i)).toBeInTheDocument()
      // New UI: no big resend button nor manual verification button
      expect(screen.getByRole('button', { name: /use another email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try resending it/i })).toBeInTheDocument()
    })
  })

  it('allows user to resend verification email (with confirm)', async () => {
    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={vi.fn()}
      />
    )

    // Open confirm dialog via the link
    await user.click(screen.getByRole('button', { name: /try resending it/i }))
    // Confirm resend
    await user.click(screen.getByRole('button', { name: /resend email/i }))

    await waitFor(() => {
      expect(screen.getByText(/we have sent you verification email/i)).toBeInTheDocument()
    })
  })

  it('handles resend email failure gracefully (with confirm)', async () => {
    server.use(
      http.post('http://localhost:3000/api/email/verification-notification', () => {
        return HttpResponse.json(
          { message: 'Email service is currently unavailable.' },
          { status: 503 }
        )
      })
    )

    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /try resending it/i }))
    await user.click(screen.getByRole('button', { name: /resend email/i }))

    await waitFor(() => {
      expect(screen.getByText(/email service is currently unavailable/i)).toBeInTheDocument()
    })
  })

  // Manual verification check button removed from UI; related tests removed.
})