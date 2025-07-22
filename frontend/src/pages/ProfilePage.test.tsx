// Mock useAuth to always return a user
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn(), loadUser: vi.fn() }),
}))
import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderWithRouter } from '@/test-utils'
import ProfilePage from './ProfilePage'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { mockUser } from '@/mocks/data/user'

// Mock navigation if needed
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock toast if needed
// vi.mock('sonner', () => ({
//   toast: { success: vi.fn(), error: vi.fn() }
// }))

describe('ProfilePage', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json({ data: mockUser })
      })
    )
  })

  it('renders the profile page correctly', async () => {
    renderWithRouter(<ProfilePage />)

    // Wait for user name to appear (ensures AuthProvider has loaded user)
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByText('Name:')).toBeInTheDocument()
    expect(screen.getByText('Email:')).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
