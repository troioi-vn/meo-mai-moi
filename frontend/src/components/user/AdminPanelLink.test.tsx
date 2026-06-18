import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { renderWithRouter } from '@/testing'
import { server } from '@/testing/mocks/server'
import { mockUser } from '@/testing/mocks/data/user'
import { AdminPanelLink } from './AdminPanelLink'

describe('AdminPanelLink', () => {
  let usersMeCallCount = 0

  beforeEach(() => {
    usersMeCallCount = 0
    server.use(
      http.get('http://localhost:3000/api/users/me', () => {
        usersMeCallCount += 1
        return HttpResponse.json({ data: mockUser })
      }),
      http.get('http://localhost:3000/api/impersonation/status', () => {
        return HttpResponse.json({ is_impersonating: false })
      })
    )
  })

  it('shows admin link when auth user can access admin', async () => {
    renderWithRouter(<AdminPanelLink />, {
      initialAuthState: {
        isAuthenticated: true,
        isLoading: false,
        user: { ...mockUser, can_access_admin: true },
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin')
    })
  })

  it('shows admin link when impersonator can access admin', async () => {
    server.use(
      http.get('http://localhost:3000/api/impersonation/status', () => {
        return HttpResponse.json({
          is_impersonating: true,
          impersonator: { can_access_admin: true },
        })
      })
    )

    renderWithRouter(<AdminPanelLink />, {
      initialAuthState: {
        isAuthenticated: true,
        isLoading: false,
        user: { ...mockUser, can_access_admin: false },
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /admin/i })).toHaveAttribute('href', '/admin')
    })
  })

  it('hides admin link for ordinary users', async () => {
    renderWithRouter(<AdminPanelLink />, {
      initialAuthState: {
        isAuthenticated: true,
        isLoading: false,
        user: { ...mockUser, can_access_admin: false },
      },
    })

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
    })
  })

  it('does not fetch /users/me', async () => {
    renderWithRouter(<AdminPanelLink />, {
      initialAuthState: {
        isAuthenticated: true,
        isLoading: false,
        user: { ...mockUser, can_access_admin: true },
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
    })

    expect(usersMeCallCount).toBe(0)
  })
})
