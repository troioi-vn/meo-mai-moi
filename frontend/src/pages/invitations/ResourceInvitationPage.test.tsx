import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import ResourceInvitationPage from './ResourceInvitationPage'
import { renderWithRouter } from '@/testing'
import { server } from '@/testing/mocks/server'
import { mockUser } from '@/testing/mocks/data/user'
import { PENDING_RESOURCE_INVITATION_TOKEN_KEY } from '@/lib/resource-invitation-continuation'

const token = 'a'.repeat(64)

describe('ResourceInvitationPage', () => {
  beforeEach(() => {
    localStorage.clear()
    server.resetHandlers()
  })

  it('keeps the continuation token until the invitation is accepted', async () => {
    localStorage.setItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY, token)

    const { user } = renderWithRouter(<ResourceInvitationPage />, {
      route: `/invite/${token}`,
      routes: [{ path: '/invite/:token', element: <ResourceInvitationPage /> }],
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      },
    })

    expect(await screen.findByText('Mochi')).toBeInTheDocument()
    expect(localStorage.getItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY)).toBe(token)

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => {
      expect(localStorage.getItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY)).toBeNull()
    })
  })

  it('clears the continuation token for a terminal invalid invitation', async () => {
    localStorage.setItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY, token)
    server.use(
      http.get('http://localhost:3000/api/resource-invitations/:token', () => {
        return HttpResponse.json(
          {
            success: false,
            data: null,
            message: 'This invitation is no longer valid.',
          },
          { status: 410 }
        )
      })
    )

    renderWithRouter(<ResourceInvitationPage />, {
      route: `/invite/${token}`,
      routes: [{ path: '/invite/:token', element: <ResourceInvitationPage /> }],
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      },
    })

    expect(await screen.findByText('This invitation is no longer valid')).toBeInTheDocument()
    expect(localStorage.getItem(PENDING_RESOURCE_INVITATION_TOKEN_KEY)).toBeNull()
  })
})
