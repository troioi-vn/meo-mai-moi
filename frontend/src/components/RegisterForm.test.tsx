import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userEvent } from '@testing-library/user-event'
import RegisterForm from './RegisterForm'

describe('RegisterForm', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('renders the registration form correctly', async () => {
    renderWithRouter(<RegisterForm />)

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })
  })

  it('shows an error message on failed registration', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    })
    renderWithRouter(<RegisterForm />)

    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'fail@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(async () => {
      expect(await screen.findByTestId('register-error-message')).toHaveTextContent(
        /Email already taken./i
      )
    })
    vi.restoreAllMocks()
  })

  it('pre-fills email field when initialEmail is provided', async () => {
    renderWithRouter(<RegisterForm initialEmail="prefilled@example.com" />)

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput.value).toBe('prefilled@example.com')
    })
  })

  it('calls onSuccess with registration response on successful registration', async () => {
    const onSuccess = vi.fn()
    renderWithRouter(<RegisterForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'success@example.com')
    await user.type(screen.getByLabelText(/^Password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            email: 'success@example.com',
            name: 'Test User',
            email_verified_at: null,
          }),
          email_verified: false,
          email_sent: true,
          requires_verification: true,
        }),
        'success@example.com'
      )
    })
  })
})
