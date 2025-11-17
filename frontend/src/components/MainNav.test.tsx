import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import MainNav from './MainNav'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'

describe('MainNav', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/notifications', () => {
        return HttpResponse.json({ data: [] })
      }),
      http.get('http://localhost:3000/api/impersonation/status', () => {
        return HttpResponse.json({ is_impersonating: false })
      })
    )
  })

  it('renders login and register buttons when not authenticated', () => {
    renderWithRouter(<MainNav />, {
      initialAuthState: { isAuthenticated: false, user: null, isLoading: false },
    })

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('renders notification bell and user menu when authenticated', async () => {
    renderWithRouter(<MainNav />, {
      initialAuthState: {
        isAuthenticated: true,
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          email_verified_at: new Date().toISOString(),
        },
        isLoading: false,
      },
    })

    // Wait for notification bell to finish loading and check for its button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/TU/i)).toBeInTheDocument() // User menu avatar with initials
  })
})
