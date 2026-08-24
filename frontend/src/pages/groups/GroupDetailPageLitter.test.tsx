import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { renderWithRouter, screen, waitFor } from '@/testing'
import { server } from '@/testing/mocks/server'
import { resetMockGroupsStore } from '@/testing/mocks/handlers'
import GroupDetailPage from './GroupDetailPage'
import { mockUser } from '@/testing/mocks/data/user'

const routes = [{ path: '/groups/:groupId', element: <GroupDetailPage /> }]

describe('GroupDetailPage litter entry point', () => {
  beforeEach(() => {
    resetMockGroupsStore()
  })

  it('shows create litter button for admin', async () => {
    renderWithRouter(<GroupDetailPage />, {
      route: '/groups/1',
      routes,
      initialAuthState: { user: mockUser, isAuthenticated: true },
    })

    expect(await screen.findByRole('heading', { name: 'Catarchy Rescue' })).toBeInTheDocument()
    expect(screen.getByTestId('group-create-litter')).toBeInTheDocument()
    expect(screen.getByTestId('group-create-litter')).toHaveTextContent('Create litter')
  })

  it('hides create litter button for non-admin member', async () => {
    server.use(
      http.get('http://localhost:3000/api/groups/:groupId', () => {
        return HttpResponse.json({
          data: {
            id: 1,
            name: 'Catarchy Rescue',
            created_by_user_id: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            viewer_role: 'member',
            member_count: 2,
            pet_count: 1,
            pets: [{ id: 1, name: 'Mochi', photo_url: null, pet_type: { id: 1, name: 'Cat' } }],
            members: [
              {
                user_id: 1,
                role: 'admin',
                start_at: '2024-01-01T00:00:00Z',
                user: { id: 1, name: 'Admin' },
              },
              {
                user_id: 2,
                role: 'member',
                start_at: '2024-01-01T00:00:00Z',
                user: { id: 2, name: 'Member' },
              },
            ],
          },
        })
      })
    )

    renderWithRouter(<GroupDetailPage />, {
      route: '/groups/1',
      routes,
    })

    expect(await screen.findByRole('heading', { name: 'Catarchy Rescue' })).toBeInTheDocument()
    expect(screen.queryByTestId('group-create-litter')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create pet' })).not.toBeInTheDocument()
  })

  it('opens litter dialog when create litter button is clicked', async () => {
    const { user } = renderWithRouter(<GroupDetailPage />, {
      route: '/groups/1',
      routes,
      initialAuthState: { user: mockUser, isAuthenticated: true },
    })

    expect(await screen.findByTestId('group-create-litter')).toBeInTheDocument()

    await user.click(screen.getByTestId('group-create-litter'))

    await waitFor(() => {
      expect(screen.getByText('Add a litter')).toBeInTheDocument()
    })
  })
})
