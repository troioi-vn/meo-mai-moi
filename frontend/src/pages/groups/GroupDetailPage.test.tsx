import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { useLocation } from 'react-router-dom'
import { renderWithRouter, screen, waitFor } from '@/testing'
import { server } from '@/testing/mocks/server'
import { resetMockGroupsStore } from '@/testing/mocks/handlers'
import GroupDetailPage from './GroupDetailPage'
import GroupSettingsPage from './GroupSettingsPage'
import { mockUser } from '@/testing/mocks/data/user'

function LocationPath() {
  return <output data-testid="location-path">{useLocation().pathname}</output>
}

const detailRoutes = [
  {
    path: '/groups/:groupId',
    element: (
      <>
        <GroupDetailPage />
        <LocationPath />
      </>
    ),
  },
  {
    path: '/groups/:groupId/settings',
    element: (
      <>
        <GroupSettingsPage />
        <LocationPath />
      </>
    ),
  },
  {
    path: '/groups',
    element: <div>Groups list</div>,
  },
]

describe('GroupDetailPage', () => {
  beforeEach(() => {
    resetMockGroupsStore()
  })

  it('loads group name, members, and pets summary', async () => {
    renderWithRouter(<GroupDetailPage />, {
      route: '/groups/1',
      routes: detailRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByRole('heading', { name: 'Catarchy Rescue' })).toBeInTheDocument()
    expect(screen.getByText(/1 members/)).toBeInTheDocument()
    expect(screen.getByText(/1 pets/)).toBeInTheDocument()
    expect(screen.getByText('Mochi')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create pet' })).toHaveAttribute(
      'href',
      '/pets/create?group_id=1'
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/groups/1/settings'
    )
  })

  it('navigates to settings from the settings affordance', async () => {
    const { user } = renderWithRouter(<GroupDetailPage />, {
      route: '/groups/1',
      routes: detailRoutes,
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    expect(await screen.findByRole('heading', { name: 'Catarchy Rescue' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Settings' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/groups/1/settings')
    })
  })

  it('handles a missing group', async () => {
    server.use(
      http.get('http://localhost:3000/api/groups/:groupId', () => {
        return new HttpResponse(null, { status: 404 })
      })
    )

    renderWithRouter(<GroupDetailPage />, {
      route: '/groups/999',
      routes: detailRoutes,
    })

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Groups' })).toHaveAttribute('href', '/groups')
  })
})
