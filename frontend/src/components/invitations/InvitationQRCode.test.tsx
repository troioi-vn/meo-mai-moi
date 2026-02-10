import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, userEvent } from '@/testing'
import InvitationQRCode from './InvitationQRCode'
import { toast } from 'sonner'

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

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('InvitationQRCode', () => {
  const defaultProps = {
    invitationUrl: 'http://localhost:3000/register?invitation_code=abc123',
    invitationCode: 'abc123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders QR code button', () => {
    render(<InvitationQRCode {...defaultProps} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens QR code dialog when button is clicked', async () => {
    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Invitation QR Code')).toBeInTheDocument()
      expect(
        screen.getByText('Share this QR code for easy access to your invitation')
      ).toBeInTheDocument()
    })
  })

  it('displays invitation code', async () => {
    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('abc123')).toBeInTheDocument()
    })
  })

  it('shows download button', async () => {
    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download qr code/i })).toBeInTheDocument()
    })
  })

  it('renders canvas element for QR code', async () => {
    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument() // Canvas acts as img
    })
  })

  it('shows invitation code in monospace font', async () => {
    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      const codeElement = screen.getByText('abc123')
      expect(codeElement).toHaveClass('font-mono')
    })
  })

  it('handles download functionality', async () => {
    const mockToDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock-data')
    HTMLCanvasElement.prototype.toDataURL = mockToDataURL

    render(<InvitationQRCode {...defaultProps} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button'))

    // Wait for dialog to open and download button to be available
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /download qr code/i })).toBeInTheDocument()
      },
      { timeout: 1000 }
    )

    // Wait for QR generation to complete (requestAnimationFrame + async QRCode.toCanvas)
    await new Promise((resolve) => setTimeout(resolve, 200))

    await user.click(screen.getByRole('button', { name: /download qr code/i }))

    await waitFor(() => {
      expect(mockToDataURL).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('messages.qrDownloaded', undefined)
    })
  })
})
