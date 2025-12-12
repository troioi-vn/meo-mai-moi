import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import EmailVerificationPage from './EmailVerificationPage'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'

const navigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useNavigate: () => navigate,
  }
})

describe('EmailVerificationPage', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('shows loading state initially', async () => {
    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    expect(screen.getByRole('heading', { name: /verifying email/i })).toBeInTheDocument()
    expect(screen.getByText(/please wait while we verify/i)).toBeInTheDocument()
  })

  it('shows success state after successful verification', async () => {
    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /email verified/i })).toBeInTheDocument()
      expect(screen.getByText(/your email has been successfully verified/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
    })
  })

  it('shows error state for invalid verification link', async () => {
    server.use(
      http.get('http://localhost:3000/api/email/verify/:id/:hash', () => {
        return HttpResponse.json(
          { message: 'Invalid or expired verification link.' },
          { status: 403 }
        )
      })
    )

    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: [
        '/email/verify/1/invalid-hash?expires=1234567890&signature=invalid-signature',
      ],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
      expect(screen.getByText(/invalid or expired verification link/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register again/i })).toBeInTheDocument()
    })
  })

  it('shows error state for already verified email', async () => {
    server.use(
      http.get('http://localhost:3000/api/email/verify/:id/:hash', () => {
        return HttpResponse.json({ message: 'Email address already verified.' }, { status: 400 })
      })
    )

    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
      expect(screen.getByText(/email address already verified/i)).toBeInTheDocument()
    })
  })

  it('shows error state for missing URL parameters', async () => {
    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash'], // Missing expires and signature
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
      expect(screen.getByText(/invalid verification link/i)).toBeInTheDocument()
    })
  })

  it('navigates to dashboard on successful verification', async () => {
    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /email verified/i })).toBeInTheDocument()
    })

    // Wait for auto-redirect
    await waitFor(
      () => {
        expect(navigate).toHaveBeenCalledWith('/')
      },
      { timeout: 3000 }
    )
  })

  it('allows manual navigation to dashboard', async () => {
    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: ['/email/verify/1/valid-hash?expires=1234567890&signature=valid-signature'],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /go to dashboard/i }))

    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('allows navigation to login from error state', async () => {
    server.use(
      http.get('http://localhost:3000/api/email/verify/:id/:hash', () => {
        return HttpResponse.json({ message: 'Invalid verification link.' }, { status: 403 })
      })
    )

    renderWithRouter(<EmailVerificationPage />, {
      initialEntries: [
        '/email/verify/1/invalid-hash?expires=1234567890&signature=invalid-signature',
      ],
      routes: [{ path: '/email/verify/:id/:hash', element: <EmailVerificationPage /> }],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /go to login/i }))

    expect(navigate).toHaveBeenCalledWith('/login')
  })
})
