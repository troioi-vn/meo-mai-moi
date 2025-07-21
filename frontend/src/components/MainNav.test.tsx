import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'
import MainNav from './MainNav'
import { beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'

describe('MainNav', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:3000/api/notifications', () => {
        return HttpResponse.json({ data: [] })
      })
    )
  })
  it('renders login and register buttons when not authenticated', () => {
    render(
      <TestAuthProvider mockValues={{ isAuthenticated: false, user: null }}>
        <MemoryRouter>
          <MainNav />
        </MemoryRouter>
      </TestAuthProvider>
    )

    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('renders notification bell and user menu when authenticated', async () => {
    render(
      <TestAuthProvider
        mockValues={{
          isAuthenticated: true,
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        }}
      >
        <MemoryRouter>
          <MainNav />
        </MemoryRouter>
      </TestAuthProvider>
    )

    // Wait for notification bell to finish loading and check for its button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/TU/i)).toBeInTheDocument() // User menu avatar with initials
  })
})
