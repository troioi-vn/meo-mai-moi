import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/test-utils'
import { LoginForm } from './LoginForm'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

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
      expect(screen.getByTestId('login-error-message')).toHaveTextContent(
        'Failed to login. Please check your credentials.'
      )
    })
    vi.restoreAllMocks()
  })

  it('redirects to /account/pets on successful login by default', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login'],
      routes: [{ path: '/account/pets', element: <TestComponent text="Pet Account Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Pet Account Page')).toBeInTheDocument()
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
      routes: [{ path: '/account/pets', element: <TestComponent text="Pet Account Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Pet Account Page')).toBeInTheDocument()
    })
  })

  it('redirects to default path if redirect param starts with //', async () => {
    renderWithRouter(<LoginForm />, {
      initialEntries: ['/login?redirect=//scam.com/malicious'],
      routes: [{ path: '/account/pets', element: <TestComponent text="Pet Account Page" /> }],
    })

    await fillAndSubmit()

    await waitFor(() => {
      expect(screen.getByText('Pet Account Page')).toBeInTheDocument()
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
      expect(
        screen.getByText(/please verify your email address before accessing/i)
      ).toBeInTheDocument()
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
