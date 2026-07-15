import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { HttpResponse, http } from 'msw'
import { useLocation } from 'react-router-dom'
import { renderWithRouter, screen, waitFor } from '@/testing'
import { server } from '@/testing/mocks/server'
import { resetMockGroupsStore } from '@/testing/mocks/handlers'
import GroupsListPage from './GroupsListPage'
import GroupDetailPage from './GroupDetailPage'

function LocationPath() {
  return <output data-testid="location-path">{useLocation().pathname}</output>
}

const groupRoutes = [
  {
    path: '/groups',
    element: (
      <>
        <GroupsListPage />
        <LocationPath />
      </>
    ),
  },
  {
    path: '/groups/:groupId',
    element: (
      <>
        <GroupDetailPage />
        <LocationPath />
      </>
    ),
  },
]

describe('GroupsListPage', () => {
  beforeEach(() => {
    resetMockGroupsStore()
  })

  it('shows the empty state when the user has no groups', async () => {
    server.use(
      http.get('http://localhost:3000/api/groups', () => {
        return HttpResponse.json({ data: [] })
      })
    )

    renderWithRouter(<GroupsListPage />, {
      route: '/groups',
      routes: groupRoutes,
    })

    expect(await screen.findByRole('heading', { name: 'Groups' })).toBeInTheDocument()
    expect(screen.getByText('You are not in any groups yet.')).toBeInTheDocument()
    expect(screen.getByTestId('create-empty-group')).toBeInTheDocument()
  })

  it('lists groups with counts and links to detail', async () => {
    const { user } = renderWithRouter(<GroupsListPage />, {
      route: '/groups',
      routes: groupRoutes,
    })

    expect(await screen.findByRole('heading', { name: 'Groups' })).toBeInTheDocument()
    expect(screen.getByText('Catarchy Rescue')).toBeInTheDocument()
    expect(screen.getByText(/1 members/)).toBeInTheDocument()
    expect(screen.getByText(/1 pets/)).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Catarchy Rescue/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent('/groups/1')
    })
  })

  it('creates an empty group and navigates to detail', async () => {
    const { user } = renderWithRouter(<GroupsListPage />, {
      route: '/groups',
      routes: groupRoutes,
    })

    expect(await screen.findByRole('heading', { name: 'Groups' })).toBeInTheDocument()

    await user.click(screen.getByTestId('create-empty-group'))
    expect(await screen.findByRole('heading', { name: 'Create group' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Group name'), 'Neighborhood Cats')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent(/^\/groups\/\d+$/)
    })
  })
})
