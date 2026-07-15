import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { renderWithRouter, screen, waitFor, within } from '@/testing'
import { server } from '@/testing/mocks/server'
import { resetMockGroupsStore } from '@/testing/mocks/handlers'
import { mockUser } from '@/testing/mocks/data/user'
import GroupSettingsPage from './GroupSettingsPage'

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

const groupWithSecondMember = {
  id: 1,
  name: 'Catarchy Rescue',
  created_by_user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  viewer_role: 'admin' as const,
  member_count: 2,
  pet_count: 1,
  pets: [
    {
      id: 1,
      name: 'Mochi',
      photo_url: null,
      pet_type: { id: 1, name: 'Cat' },
    },
  ],
  members: [
    {
      user_id: 1,
      role: 'admin' as const,
      start_at: '2024-01-01T00:00:00Z',
      user: { id: 1, name: 'Test User' },
    },
    {
      user_id: 2,
      role: 'member' as const,
      start_at: '2024-01-01T00:00:00Z',
      user: { id: 2, name: 'Helper Friend' },
    },
  ],
}

const settingsRoutes = [
  { path: '/groups/:groupId/settings', element: <GroupSettingsPage /> },
  { path: '/groups/:groupId', element: <div>Group detail</div> },
]

describe('GroupSettingsPage', () => {
  beforeEach(() => {
    resetMockGroupsStore()
    vi.clearAllMocks()
  })

  it('renders the settings shell for an admin', async () => {
    renderWithRouter(<GroupSettingsPage />, {
      route: '/groups/1/settings',
      routes: settingsRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByRole('heading', { name: 'Group settings' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to group' })).toHaveAttribute('href', '/groups/1')
    expect(screen.getByText('Group name')).toBeInTheDocument()
    expect(screen.getByText('Pets')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Invitations')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite someone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Catarchy Rescue')).toBeInTheDocument()
    expect(screen.getByText('Mochi')).toBeInTheDocument()
  })

  it('opens the invite dialog as a membership invite affordance', async () => {
    const { user } = renderWithRouter(<GroupSettingsPage />, {
      route: '/groups/1/settings',
      routes: settingsRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByRole('heading', { name: 'Group settings' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Invite someone' }))

    expect(await screen.findByRole('heading', { name: 'Add person' })).toBeInTheDocument()
    expect(await screen.findByText('Suggested Friend')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create invitation' })).toBeInTheDocument()
  })

  it('removes a pet from the group through the pets settings path', async () => {
    const removePet = vi.fn(() => new HttpResponse(null, { status: 204 }))
    server.use(http.delete('http://localhost:3000/api/groups/:groupId/pets/:petId', removePet))

    const { user } = renderWithRouter(<GroupSettingsPage />, {
      route: '/groups/1/settings',
      routes: settingsRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByText('Mochi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove from group' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Remove Mochi from this group/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove from group' }))

    await waitFor(() => {
      expect(removePet).toHaveBeenCalled()
    })
  })

  it('can change another member role', async () => {
    const updateMember = vi.fn(async ({ request }) => {
      const raw = await request.json()
      const body = raw && typeof raw === 'object' ? (raw as { role?: string }) : {}
      return HttpResponse.json({
        data: {
          user_id: 2,
          role: body.role ?? 'admin',
          start_at: '2024-01-01T00:00:00Z',
          user: { id: 2, name: 'Helper Friend' },
        },
      })
    })

    server.use(
      http.get('http://localhost:3000/api/groups/:groupId', () => {
        return HttpResponse.json({ data: groupWithSecondMember })
      }),
      http.put('http://localhost:3000/api/groups/:groupId/members/:userId', updateMember)
    )

    const { user } = renderWithRouter(<GroupSettingsPage />, {
      route: '/groups/1/settings',
      routes: settingsRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByText('Helper Friend')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Change role' }))
    await user.click(await screen.findByRole('option', { name: 'Admin' }))

    await waitFor(() => {
      expect(updateMember).toHaveBeenCalled()
    })
  })
})
