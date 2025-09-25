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
    // Mock successful login by default
    server.use(
      http.post('http://localhost:3000/api/login', () => {
        return new HttpResponse(null, { status: 204 })
      }),
      http.get('http://localhost:3000/api/user', () => {
        return HttpResponse.json({
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          avatar_url: 'https://example.com/avatar.jpg',
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

  it('allows the user to fill out the form', async () => {
    renderWithRouter(<LoginForm />)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    expect((emailInput as HTMLInputElement).value).toBe('test@example.com')
    expect((passwordInput as HTMLInputElement).value).toBe('password123')
  })

  it('shows an error message on failed login', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    server.use(
      http.post('http://localhost:3000/api/login', () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      })
    )

    renderWithRouter(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'fail@example.com')
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
})
