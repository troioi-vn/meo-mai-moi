import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { render, userEvent } from '@/testing'
import { RevokeInvitationDialog } from './RevokeInvitationDialog'

describe('RevokeInvitationDialog', () => {
  it('requires explicit confirmation before revoking', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RevokeInvitationDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} />)

    expect(onConfirm).not.toHaveBeenCalled()
    expect(
      screen.getByText('The invitation link and QR code will stop working immediately.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
