import { screen, waitFor, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter, userEvent } from '@/testing'
import InvitationsPage from './InvitationsPage'
import { server } from '@/testing/mocks/server'
import { HttpResponse, http } from 'msw'
import { toast } from 'sonner'
import type { User } from '@/types/user'
import * as inviteSystemApi from '@/api/invite-system'

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

const mockInvitations = [
  {
    id: 1,
    code: 'abc123xyz',
    status: 'pending',
    expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    invitation_url: 'http://localhost:3000/register?invitation_code=abc123xyz',
    recipient: null,
  },
  {
    id: 2,
    code: 'def456abc',
    status: 'accepted',
    expires_at: null,
    created_at: '2024-01-02T00:00:00Z',
    invitation_url: 'http://localhost:3000/register?invitation_code=def456abc',
    recipient: {
      id: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
  },
  {
    id: 3,
    code: 'ghi789def',
    status: 'expired',
    expires_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    invitation_url: 'http://localhost:3000/register?invitation_code=ghi789def',
    recipient: null,
  },
]

const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
}

describe('InvitationsPage', () => {
  const renderInvitationsPage = () => {
    return renderWithRouter(<InvitationsPage />, {
      initialAuthState: {
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()

    server.use(
      http.get('http://localhost:3000/api/invitations', () => {
        return HttpResponse.json({ data: mockInvitations })
      }),
      http.get('http://localhost:3000/api/invitations/stats', () => {
        return HttpResponse.json({
          data: { total: 3, pending: 1, accepted: 1, expired: 1, revoked: 0 },
        })
      })
    )
  })

  it('renders the invitations page correctly', async () => {
    renderInvitationsPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^invitations$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate invitation/i })).toBeInTheDocument()

      // Check truncated invitation codes are displayed
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
      expect(screen.getByText(/def456ab/)).toBeInTheDocument()
      expect(screen.getByText(/ghi789de/)).toBeInTheDocument()

      // Check status badges - use getAllByText since stats also show these
      const pendingElements = screen.getAllByText('Pending')
      const acceptedElements = screen.getAllByText('Accepted')
      const expiredElements = screen.getAllByText('Expired')

      expect(pendingElements.length).toBeGreaterThan(0)
      expect(acceptedElements.length).toBeGreaterThan(0)
      expect(expiredElements.length).toBeGreaterThan(0)

      // Check recipient info
      expect(screen.getByText(/Accepted by Jane Doe/)).toBeInTheDocument()
    })
  })

  it('hides the revoked stats card when revoked is 0', async () => {
    renderInvitationsPage()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Revoked')).not.toBeInTheDocument()
  })

  it('shows the revoked stats card when revoked is greater than 0', async () => {
    server.use(
      http.get('http://localhost:3000/api/invitations/stats', () => {
        return HttpResponse.json({
          data: { total: 3, pending: 1, accepted: 1, expired: 1, revoked: 2 },
        })
      })
    )

    renderInvitationsPage()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    const revokedTitle = screen.getByText('Revoked')
    expect(revokedTitle).toBeInTheDocument()

    const revokedCard = revokedTitle.closest('[data-slot="card"]')
    expect(revokedCard).toBeTruthy()

    const revokedNumber = within(revokedCard as HTMLElement).getByText('2')
    expect(revokedNumber).toHaveClass('text-left')
  })

  it('generates new invitation successfully', async () => {
    server.use(
      http.post('http://localhost:3000/api/invitations', () => {
        return HttpResponse.json(
          {
            data: {
              id: 4,
              code: 'new123',
              status: 'pending',
              created_at: '2024-01-03T00:00:00Z',
              invitation_url: 'http://localhost:3000/register?invitation_code=new123',
              recipient: null,
              expires_at: null,
            },
          },
          { status: 201 }
        )
      })
    )

    renderInvitationsPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /generate invitation/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Invitation generated successfully!')
    })
  })

  it('handles invitation generation rate limit', async () => {
    server.use(
      http.post('http://localhost:3000/api/invitations', () => {
        return HttpResponse.json({ error: 'Daily invitation limit exceeded' }, { status: 429 })
      })
    )

    renderInvitationsPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /generate invitation/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to generate invitation. You may have reached your daily limit.'
      )
    })
  })

  it('revokes invitation successfully', async () => {
    server.use(
      http.delete('http://localhost:3000/api/invitations/1', () => {
        return HttpResponse.json({})
      })
    )

    renderInvitationsPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    const revokeButtons = screen.getAllByTitle('Revoke invitation')
    await user.click(revokeButtons[0])

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Invitation revoked successfully')
    })
  })

  it('handles revoke invitation error', async () => {
    server.use(
      http.delete('http://localhost:3000/api/invitations/1', () => {
        return HttpResponse.json({ error: 'Invitation not found' }, { status: 404 })
      })
    )

    renderInvitationsPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    const revokeButtons = screen.getAllByTitle('Revoke invitation')
    await user.click(revokeButtons[0])

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to revoke invitation')
    })
  })

  it('shows empty state when no invitations exist', async () => {
    server.use(
      http.get('http://localhost:3000/api/invitations', () => {
        return HttpResponse.json({ data: [] })
      })
    )

    renderInvitationsPage()

    await waitFor(() => {
      expect(screen.getByText(/no invitations yet/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /generate your first invitation/i })
      ).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching invitations', async () => {
    server.use(
      http.get('http://localhost:3000/api/invitations', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return HttpResponse.json({ data: mockInvitations })
      })
    )

    renderInvitationsPage()

    expect(screen.getByText(/loading your invitations/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })
  })

  it('handles fetch invitations error', async () => {
    server.use(
      http.get('http://localhost:3000/api/invitations', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 })
      })
    )

    renderInvitationsPage()

    await waitFor(() => {
      expect(screen.getByText(/failed to load invitations/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('refreshes invitations data periodically', async () => {
    const intervalSpy = vi.spyOn(window, 'setInterval')
    const getUserInvitationsMock = vi.spyOn(inviteSystemApi, 'getUserInvitations')
    const getInvitationStatsMock = vi.spyOn(inviteSystemApi, 'getInvitationStats')

    const refreshedInvitations = [
      ...mockInvitations,
      {
        id: 4,
        code: 'newrefresh',
        status: 'pending',
        expires_at: null,
        created_at: '2024-01-04T00:00:00Z',
        invitation_url: 'http://localhost:3000/register?invitation_code=newrefresh',
        recipient: null,
      },
    ]

    const refreshedStats = { total: 4, pending: 2, accepted: 1, expired: 1, revoked: 0 }

    getUserInvitationsMock.mockResolvedValueOnce(mockInvitations)
    getUserInvitationsMock.mockResolvedValue(refreshedInvitations)
    getInvitationStatsMock.mockResolvedValueOnce({
      total: 3,
      pending: 1,
      accepted: 1,
      expired: 1,
      revoked: 0,
    })
    getInvitationStatsMock.mockResolvedValue(refreshedStats)

    try {
      renderInvitationsPage()

      await waitFor(() => {
        expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
      })

      expect(intervalSpy).toHaveBeenCalled()

      const intervalCall = intervalSpy.mock.calls.find(([, delay]) => delay === 30_000)
      expect(intervalCall).toBeDefined()

      const intervalCallback = intervalCall?.[0] as (() => void) | undefined
      expect(intervalCallback).toBeDefined()

      act(() => {
        intervalCallback?.()
      })

      await waitFor(() => {
        expect(getUserInvitationsMock).toHaveBeenCalledTimes(2)
        expect(getInvitationStatsMock).toHaveBeenCalledTimes(2)
      })

      await waitFor(() => {
        expect(screen.getByText(/newrefre/)).toBeInTheDocument()
      })
    } finally {
      intervalSpy.mockRestore()
      getUserInvitationsMock.mockRestore()
      getInvitationStatsMock.mockRestore()
    }
  })

  it('copies invitation link to clipboard', async () => {
    // Spy on the already mocked clipboard.writeText
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')

    renderInvitationsPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/abc123xy/)).toBeInTheDocument()
    })

    // Find the copy button for the pending invitation (should be enabled)
    const copyButtons = screen.getAllByTitle('Copy invitation link')
    const enabledCopyButton = copyButtons.find((button) => !(button as HTMLButtonElement).disabled)
    expect(enabledCopyButton).toBeDefined()

    await user.click(enabledCopyButton!)

    expect(writeTextSpy).toHaveBeenCalledWith(
      'http://localhost:3000/register?invitation_code=abc123xyz'
    )
    expect(toast.success).toHaveBeenCalledWith('Invitation link copied to clipboard!')
  })
})
