import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { render, userEvent } from '@/test-utils'
import WaitlistForm from './WaitlistForm'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'

const mockOnSuccess = vi.fn()

describe('WaitlistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the waitlist form correctly', () => {
    render(<WaitlistForm onSuccess={mockOnSuccess} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
  })

  it('submits email successfully and calls onSuccess', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', () => {
        return HttpResponse.json({
          data: {
            email: 'test@example.com',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z'
          }
        }, { status: 201 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    // HTML5 validation should prevent form submission
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows error when email is already on waitlist', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', () => {
        return HttpResponse.json({
          error: 'Email is already on waitlist'
        }, { status: 409 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is already on waitlist/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows error when email is already registered', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', () => {
        return HttpResponse.json({
          error: 'Email is already registered'
        }, { status: 409 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'registered@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is already registered/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          data: {
            email: 'test@example.com',
            status: 'pending',
            created_at: '2024-01-01T00:00:00Z'
          }
        }, { status: 201 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    // Should show loading state
    expect(screen.getByRole('button', { name: /joining waitlist/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /joining waitlist/i })).toBeDisabled()

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles server errors gracefully', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', () => {
        return HttpResponse.json({
          error: 'Server error'
        }, { status: 500 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('clears error when user starts typing again', async () => {
    server.use(
      http.post('http://localhost:3000/api/waitlist', () => {
        return HttpResponse.json({
          error: 'Email is already on waitlist'
        }, { status: 409 })
      })
    )

    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    // Submit invalid form to show error
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is already on waitlist/i)).toBeInTheDocument()
    })

    // Clear input and type new email
    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')

    // Error should be cleared
    expect(screen.queryByText(/email is already on waitlist/i)).not.toBeInTheDocument()
  })

  it('requires email field to be filled', async () => {
    render(<WaitlistForm onSuccess={mockOnSuccess} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /join waitlist/i }))

    // HTML5 validation should prevent form submission
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })
})