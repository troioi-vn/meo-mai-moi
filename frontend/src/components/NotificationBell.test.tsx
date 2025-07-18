import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import { NotificationBell } from './NotificationBell'
import { vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'

vi.mock('@/hooks/use-auth')

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' }

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('fetches and displays the number of unread notifications', async () => {
    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      const badge = screen.getByTestId('notification-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('1') // Based on the mock handler, one is unread
    })
  })
})
