import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import { LoginForm } from './LoginForm'
import { http, HttpResponse } from 'msw'
import { server } from '@/testing/mocks/server'

describe('LoginForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    // Mock email check endpoint
    server.use(
      http.post('http://localhost:3000/api/check-email', () => {
        return HttpResponse.json({
          data: {
            exists: true,
          },
        })
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
    // Step 1: Enter email and click Next
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Step 2: Enter password and click Login
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))
  }

  it('renders the login form correctly', async () => {
    renderWithRouter(<LoginForm />)
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })
    // Password field should not be visible initially
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
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

    // Click Next to proceed to password step
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

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

    // Step 1: Enter email and proceed
    await user.type(screen.getByLabelText(/email/i), 'fail@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Step 2: Enter password and submit
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

  it('redirects to register when email does not exist', async () => {
    server.use(
      http.post('http://localhost:3000/api/check-email', () => {
        return HttpResponse.json({
          data: {
            exists: false,
          },
        })
      })
    )

    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login'],
      routes: [{ path: '/register', element: <TestComponent text="Register Page" /> }],
    })

    // Enter non-existing email and click Next
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText('Register Page')).toBeInTheDocument()
    })
  })

  it('shows back button and allows returning to email step', async () => {
    renderWithRouter(<LoginForm />)

    // Step 1: Enter email and proceed
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field and back button
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    })

    // Click back button
    await user.click(screen.getByRole('button', { name: /back/i }))

    // Should be back to email step
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
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

    // Step 1: Enter email and proceed
    await user.type(screen.getByLabelText(/email/i), 'unverified@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Step 2: Enter password and submit
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

    // Step 1: Enter email and proceed
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Wait for password field
    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

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
