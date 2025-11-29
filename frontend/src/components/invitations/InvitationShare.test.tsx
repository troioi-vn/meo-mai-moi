import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, userEvent } from '@/testing'
import InvitationShare from './InvitationShare'

vi.mock('sonner', async () => {
  const actual = await vi.importActual('sonner')
  return {
    ...(actual as object),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('InvitationShare', () => {
  const defaultProps = {
    invitationUrl: 'http://localhost:3000/register?invitation_code=abc123',
    invitationCode: 'abc123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders share button', () => {
    render(<InvitationShare {...defaultProps} />)

    expect(screen.getByRole('button', { name: /share invitation/i })).toBeInTheDocument()
  })

  it('opens share dialog when button is clicked', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByText('Share Invitation')).toBeInTheDocument()
      expect(screen.getByDisplayValue(defaultProps.invitationUrl)).toBeInTheDocument()
    })
  })

  it('shows invitation URL in input field', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue(defaultProps.invitationUrl)).toBeInTheDocument()
    })
  })

  it('shows copy URL button', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // Copy button with just icon
    })
  })

  it('shows pre-written message', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/ready-to-send message/i)).toBeInTheDocument()
      expect(screen.getByText(/hi! i'd like to invite you/i)).toBeInTheDocument()
    })
  })

  it('shows copy message button', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument()
    })
  })

  it('shows email and SMS share buttons', async () => {
    render(<InvitationShare {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sms/i })).toBeInTheDocument()
    })
  })

  it('has copy functionality available', async () => {
    render(<InvitationShare {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /share invitation/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue(defaultProps.invitationUrl)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument()
    })

    // Just verify the buttons exist - actual clipboard testing is complex
    const copyButtons = screen.getAllByRole('button')
    expect(copyButtons.length).toBeGreaterThan(2) // Share, Copy URL, Copy Message, Email, SMS
  })
})
