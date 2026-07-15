import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { render, userEvent } from '@/testing'
import { ResourceSharingDialog } from './ResourceSharingDialog'

vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}))

describe('ResourceSharingDialog', () => {
  it('selects the default role and confirms a suggested direct add', async () => {
    const addSuggested = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ResourceSharingDialog
        open
        onOpenChange={vi.fn()}
        targetName="Miso"
        description="Share access to Miso"
        roles={[
          { value: 'owner', label: 'Co-owner', description: 'Full access' },
          { value: 'viewer', label: 'Viewer' },
        ]}
        defaultRole="owner"
        loadSuggestions={vi.fn().mockResolvedValue([{ id: 7, name: 'Alice' }])}
        createInvitation={vi.fn()}
        addSuggested={addSuggested}
      />
    )

    expect(await screen.findByText('Co-owner')).toBeInTheDocument()
    expect(screen.getByText('Suggested')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(addSuggested).not.toHaveBeenCalled()

    const confirmation = screen.getByRole('alertdialog')
    expect(within(confirmation).getByText('Add Alice to Miso as Co-owner?')).toBeInTheDocument()
    await user.click(within(confirmation).getByRole('button', { name: 'Add' }))
    await waitFor(() => {
      expect(addSuggested).toHaveBeenCalledWith(7, 'owner')
    })
  })

  it('omits the role step for finances and renders the QR state without a redundant label', async () => {
    const user = userEvent.setup()
    render(
      <ResourceSharingDialog
        open
        onOpenChange={vi.fn()}
        targetName="Rescue ledger"
        description="Share finance access"
        loadSuggestions={vi.fn().mockResolvedValue([])}
        createInvitation={vi.fn().mockResolvedValue({
          id: 9,
          invitationUrl: 'https://example.test/invite/token',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })}
        addSuggested={vi.fn()}
      />
    )

    expect(screen.queryByText('Select role')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create invitation' }))
    expect(await screen.findByRole('img', { name: 'Invitation QR code' })).toBeInTheDocument()
    expect(screen.queryByText('Create invitation')).not.toBeInTheDocument()
  })
})
