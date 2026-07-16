import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { http, HttpResponse } from 'msw'
import { render } from '@/testing'
import { AllTheProviders } from '@/testing/providers'
import { server } from '@/testing/mocks/server'
import NotificationsPage from './NotificationsPage'

const verifiedUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  email_verified_at: new Date().toISOString(),
}

function renderNotificationsPage() {
  return render(
    <MemoryRouter>
      <AllTheProviders initialAuthState={{ user: verifiedUser, isAuthenticated: true }}>
        <NotificationsPage />
      </AllTheProviders>
    </MemoryRouter>
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the empty state when there are no bell notifications', async () => {
    server.use(
      http.get('http://localhost:3000/api/notifications/unified', () =>
        HttpResponse.json({
          bell_notifications: [],
          unread_bell_count: 0,
          unread_message_count: 0,
        })
      )
    )

    renderNotificationsPage()

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all as read/i })).toBeDisabled()
  })

  it('loads notifications and marks an item read when it is opened', async () => {
    let markedNotificationId: string | null = null
    server.use(
      http.get('http://localhost:3000/api/notifications/unified', ({ request }) => {
        const includeBell = new URL(request.url).searchParams.get('include_bell_notifications')
        return HttpResponse.json({
          bell_notifications:
            includeBell === 'true'
              ? [
                  {
                    id: 'notice-1',
                    level: 'info',
                    title: 'New placement response',
                    body: 'A helper replied to your request.',
                    url: null,
                    created_at: new Date().toISOString(),
                    read_at: null,
                  },
                ]
              : [],
          unread_bell_count: 0,
          unread_message_count: 0,
        })
      }),
      http.patch('http://localhost:3000/api/notifications/:id/read', ({ params }) => {
        markedNotificationId = String(params.id)
        return new HttpResponse(null, { status: 204 })
      })
    )

    renderNotificationsPage()

    const notification = await screen.findByRole('button', { name: /new placement response/i })
    expect(screen.getByText('A helper replied to your request.')).toBeInTheDocument()

    await userEvent.setup().click(notification)

    await waitFor(() => {
      expect(markedNotificationId).toBe('notice-1')
    })
  })
})
