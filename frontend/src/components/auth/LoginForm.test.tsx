import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { renderWithRouter, userEvent } from '@/testing'
import { LoginForm } from './LoginForm'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'

describe('LoginForm', () => {
  let user: ReturnType<typeof userEvent.setup>
  let csrfRequestCount = 0

  beforeEach(() => {
    vi.unstubAllEnvs()
    user = userEvent.setup()
    csrfRequestCount = 0
    server.use(
      http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
        csrfRequestCount += 1
        return HttpResponse.json({}, { status: 204 })
      }),
      http.post('http://localhost:3000/login', () => {
        return HttpResponse.json({
          data: {
            user: {
              id: 1,
              name: 'Test User',
              email: 'test@example.com',
              email_verified_at: new Date().toISOString(),
            },
            two_factor: false,
          },
        })
      }),
      http.get('http://localhost:3000/api/users/me', () => {
        return HttpResponse.json({
          data: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        })
      })
    )
  })

  const TestComponent = ({ text }: { text: string }) => <div>{text}</div>

  const fillAndSubmit = async () => {
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))
  }

  it('renders the login form correctly', async () => {
    renderWithRouter(<LoginForm />)
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })
  })

  it('shows the Google login button with default redirect', async () => {
    renderWithRouter(<LoginForm />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect'
    )
  })

  it('shows the Telegram login button immediately from env fallback while settings are still loading', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'env_test_bot')
    server.use(
      http.get('http://localhost:3000/api/settings/public', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return HttpResponse.json({
          data: {
            invite_only_enabled: false,
            email_verification_required: true,
            telegram_bot_username: 'api_test_bot',
          },
        })
      })
    )

    renderWithRouter(<LoginForm />)

    const telegramButton = screen.getByRole('link', { name: /sign in with telegram/i })
    expect(telegramButton).toBeInTheDocument()
    expect(telegramButton).toHaveAttribute('href', 'https://t.me/env_test_bot?start=login')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with telegram/i })).toHaveAttribute(
        'href',
        'https://t.me/api_test_bot?start=login'
      )
    })
  })

  it('keeps the Telegram login button available from env fallback when settings request fails', async () => {
    vi.stubEnv('VITE_TELEGRAM_BOT_USERNAME', 'env_test_bot')
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({ message: 'settings unavailable' }, { status: 500 })
      })
    )

    renderWithRouter(<LoginForm />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with telegram/i })).toHaveAttribute(
        'href',
        'https://t.me/env_test_bot?start=login'
      )
    })
  })

  it('includes redirect param on Google login button when provided', async () => {
    renderWithRouter(<LoginForm />, { initialEntries: ['/login?redirect=/account/pets'] })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    // The redirect param is URL-encoded
    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect?redirect=%2Faccount%2Fpets'
    )
  })

  it('includes invitation_code param on Google login button when provided', async () => {
    renderWithRouter(<LoginForm />, { initialEntries: ['/login?invitation_code=CODE123'] })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /sign in with google/i })).toHaveAttribute(
      'href',
      '/auth/google/redirect?invitation_code=CODE123'
    )
  })

  it('includes both redirect and invitation_code params on Google login button', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login?redirect=/account/pets&invitation_code=CODE123'],
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with google/i })).toBeInTheDocument()
    })

    const href = screen.getByRole('link', { name: /sign in with google/i }).getAttribute('href')
    expect(href).toContain('redirect=%2Faccount%2Fpets')
    expect(href).toContain('invitation_code=CODE123')
  })

  it('displays an initial error message when provided', async () => {
    renderWithRouter(<LoginForm initialErrorMessage="Email already exists" />)

    await waitFor(() => {
      expect(screen.getByTestId('login-error-message')).toHaveTextContent('Email already exists')
    })
  })

  it('allows the user to fill out the form', async () => {
    renderWithRouter(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)

    await user.type(emailInput, 'test@example.com')
    expect((emailInput as HTMLInputElement).value).toBe('test@example.com')

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'password123')
    expect((passwordInput as HTMLInputElement).value).toBe('password123')
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

    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'fail@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      // The error message is from i18n (auth:login.error)
      // In tests, i18n is auto-configured in setup.ts to use English
      const errorElement = screen.getByTestId('login-error-message')
      expect(errorElement).toBeInTheDocument()
      // Verify the translated string is present (i18n key: auth:login.error)
      expect(errorElement.textContent).toBeTruthy()
    })
    vi.restoreAllMocks()
  })

  it('redirects to / on successful login by default', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login'],
      routes: [{ path: '/', element: <TestComponent text="Home Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })
  })

  it('re-primes csrf after successful login', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login'],
      routes: [{ path: '/', element: <TestComponent text="Home Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })

    expect(csrfRequestCount).toBe(2)
  })

  it('keeps login successful if post-login csrf refresh fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* empty */
    })

    server.use(
      http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
        csrfRequestCount += 1
        if (csrfRequestCount === 2) {
          return HttpResponse.json({ message: 'csrf unavailable' }, { status: 503 })
        }
        return HttpResponse.json({}, { status: 204 })
      })
    )

    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login'],
      routes: [{ path: '/', element: <TestComponent text="Home Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })

    expect(csrfRequestCount).toBe(2)
    expect(consoleWarnSpy).toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('redirects to the provided relative path on successful login', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login?redirect=/custom-path'],
      routes: [{ path: '/custom-path', element: <TestComponent text="Custom Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Custom Page')).toBeInTheDocument()
    })
  })

  it('redirects to default path if redirect param is an absolute URL', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login?redirect=http://scam.com/malicious'],
      routes: [{ path: '/', element: <TestComponent text="Home Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })
  })

  it('redirects to default path if redirect param starts with //', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login?redirect=//scam.com/malicious'],
      routes: [{ path: '/', element: <TestComponent text="Home Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument()
    })
  })

  it('shows email verification prompt for unverified users', async () => {
    server.use(
      http.post('http://localhost:3000/login', () => {
        return HttpResponse.json({
          data: {
            user: {
              id: 1,
              name: 'Test User',
              email: 'unverified@example.com',
              email_verified_at: null,
            },
            two_factor: false,
          },
        })
      })
    )

    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
      // Message from i18n is "We've sent a verification link to your email"
      expect(screen.getByText(/we've sent a verification link to your email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument()
    })
  })

  it('toggles password visibility', async () => {
    renderWithRouter(<LoginForm />)

    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]')

    expect(passwordInput).toHaveAttribute('type', 'password')

    if (toggleButton) {
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })
})
