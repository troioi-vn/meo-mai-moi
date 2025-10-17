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
      expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /i've verified my email/i })).toBeInTheDocument()
    })
  })

  it('allows user to resend verification email', async () => {
    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /resend verification email/i }))

    await waitFor(() => {
      expect(screen.getByText(/we have sent you verification email/i)).toBeInTheDocument()
    })
  })

  it('handles resend email failure gracefully', async () => {
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

    await user.click(screen.getByRole('button', { name: /resend verification email/i }))

    await waitFor(() => {
      expect(screen.getByText(/email service is currently unavailable/i)).toBeInTheDocument()
    })
  })

  it('calls onVerificationComplete when user clicks verification check button', async () => {
    server.use(
      http.get('http://localhost:3000/api/email/verification-status', () => {
        return HttpResponse.json({
          data: {
            verified: true,
            email: 'test@example.com',
          }
        })
      })
    )

    const onVerificationComplete = vi.fn()
    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={onVerificationComplete}
      />
    )

    await user.click(screen.getByRole('button', { name: /i've verified my email/i }))

    await waitFor(() => {
      expect(onVerificationComplete).toHaveBeenCalled()
    })
  })

  it('does not call onVerificationComplete if user is still unverified', async () => {
    server.use(
      http.get('http://localhost:3000/api/email/verification-status', () => {
        return HttpResponse.json({
          data: {
            verified: false,
            email: 'test@example.com',
          }
        })
      })
    )

    const onVerificationComplete = vi.fn()
    renderWithRouter(
      <EmailVerificationPrompt
        email="test@example.com"
        message="Please verify your email address."
        emailSent={true}
        onVerificationComplete={onVerificationComplete}
      />
    )

    await user.click(screen.getByRole('button', { name: /i've verified my email/i }))

    await waitFor(() => {
      expect(onVerificationComplete).not.toHaveBeenCalled()
    })
  })
})