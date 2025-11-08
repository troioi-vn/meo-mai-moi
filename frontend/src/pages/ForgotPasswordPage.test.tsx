import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { userEvent, renderWithRouter } from '@/test-utils'
import ForgotPasswordPage from './ForgotPasswordPage'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

beforeEach(() => {
  vi.clearAllMocks()
})

// Simple render function without the full router setup
const renderPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  )
}

describe('ForgotPasswordPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('renders forgot password form', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument()
  })

  it('submits email and shows success message', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json({
          data: {
            message: 'Password reset link sent',
          },
        })
      })
    )

    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      expect(screen.getByText(/we've sent password reset instructions/i)).toBeInTheDocument()
    })
  })

  it('shows error for invalid email', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json(
          { message: 'The email field must be a valid email address.' },
          { status: 422 }
        )
      })
    )

    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('shows rate limit error', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json({ message: 'Too Many Attempts.' }, { status: 429 })
      })
    )

    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
    })
  })

  it('allows sending another email after success', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', () => {
        return HttpResponse.json({
          data: {
            message: 'Password reset link sent',
          },
        })
      })
    )

    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /send another email/i }))

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toHaveValue('')
  })

  it('shows loading state during submission', async () => {
    server.use(
      http.post('http://localhost:3000/api/password/email', async () => {
        // Delay response to test loading state
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({
          data: {
            message: 'Password reset link sent',
          },
        })
      })
    )

    renderPage()

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(screen.getByRole('button', { name: /sending.../i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeDisabled()
  })

  it('prefills email from URL parameter', () => {
    renderWithRouter(<ForgotPasswordPage />, {
      initialEntries: ['/forgot-password?email=prefilled@example.com'],
      routes: [{ path: '/forgot-password', element: <ForgotPasswordPage /> }],
    })

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    expect(emailInput.value).toBe('prefilled@example.com')
  })
})
