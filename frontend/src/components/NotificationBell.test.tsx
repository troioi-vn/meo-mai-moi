import { screen, waitFor } from '@testing-library/react'
import { renderWithRouter } from '@/test-utils'
import { NotificationBell } from './NotificationBell'
import { vi } from 'vitest'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/api/axios'
import { mockUser } from '@/mocks/data/user'

vi.mock('@/hooks/use-auth')
vi.mock('@/api/axios')

describe('NotificationBell', () => {
  let mockApiGet: any
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

    // Mock the API response for notifications
    mockApiGet = vi.spyOn(api, 'get')
    mockApiGet.mockImplementation(async (url: string) => {
      if (url === '/notifications') {
        return Promise.resolve({
          data: {
            data: {
              notifications: [
                {
                  id: '1',
                  type: 'App\\Notifications\\NewFollower',
                  notifiable_type: 'App\\Models\\User',
                  notifiable_id: 1,
                  data: { message: 'You have a new follower' },
                  read_at: null,
                  created_at: new Date().toISOString(),
                },
              ],
              unread_count: 1,
            },
          },
        })
      } else if (url === '/user') {
        return Promise.resolve({ data: { data: mockUser } })
      }
      return Promise.reject(new Error(`Unhandled GET request: ${String(url)}`))
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
