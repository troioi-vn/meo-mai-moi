import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithRouter } from '@/testing'
import { useNotifications } from '@/contexts/NotificationProvider'
import { NotificationBell } from './NotificationBell'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  email_verified_at: new Date().toISOString(),
}

function RefreshControl() {
  const { refresh } = useNotifications()
  return (
    <button type="button" onClick={() => void refresh({ includeBellNotifications: true })}>
      Refresh
    </button>
  )
}

describe('NotificationBell behavior', () => {
  it('shows unread badge and links to notifications page', async () => {
    // Ensure API returns two unread
    server.use(
      http.get('http://localhost:3000/api/notifications/unified', () => {
        return HttpResponse.json({
          bell_notifications: [
            {
              id: 'a',
              level: 'info',
              title: 'Welcome',
              body: 'Hello',
              url: null,
              created_at: new Date().toISOString(),
              read_at: null,
            },
            {
              id: 'b',
              level: 'success',
              title: 'Saved',
              body: null,
              url: null,
              created_at: new Date().toISOString(),
              read_at: null,
            },
          ],
          unread_bell_count: 2,
          unread_message_count: 0,
        })
      })
    )

    renderWithRouter(<NotificationBell />, {
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
      },
    })

    const link = await screen.findByRole('link', { name: /open notifications/i })
    await waitFor(() => {
      expect(within(link).getByText('2')).toBeInTheDocument()
    })
    expect(link).toHaveAttribute('href', '/notifications')
  })

  it('shows a toast when a new notification is fetched on refresh', async () => {
    const calls: number[] = []
    server.use(
      http.get('http://localhost:3000/api/notifications/unified', () => {
        calls.push(1)
        // First call: nothing → no initial toast
        if (calls.length === 1) {
          return HttpResponse.json({
            bell_notifications: [],
            unread_bell_count: 0,
            unread_message_count: 0,
          })
        }
        // Second call: one new unread
        return HttpResponse.json({
          bell_notifications: [
            {
              id: 'n-new',
              level: 'warning',
              title: 'Heads up',
              body: 'Check settings',
              url: null,
              created_at: new Date().toISOString(),
              read_at: null,
            },
          ],
          unread_bell_count: 1,
          unread_message_count: 0,
        })
      })
    )

    // Reset toast mocks
    vi.clearAllMocks()

    renderWithRouter(
      <>
        <NotificationBell />
        <RefreshControl />
      </>,
      {
        initialAuthState: {
          user: mockUser,
          isAuthenticated: true,
        },
      }
    )

    // Wait for initial empty fetch to settle
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /open notifications/i })
      expect(within(link).queryByText('1')).not.toBeInTheDocument()
    })

    // Trigger a manual refresh (simulates what the Echo event handler would do)
    await screen.findByRole('button', { name: 'Refresh' }).then((btn) => {
      btn.click()
    })

    // Wait until the second fetch triggers and toast is emitted
    await waitFor(() => {
      // Any variant is fine, but warning should be called based on level mapping
      // @ts-expect-error - Vitest mock type
      expect(toast.warning.mock.calls.length).toBeGreaterThan(0)
    })
  })
})
