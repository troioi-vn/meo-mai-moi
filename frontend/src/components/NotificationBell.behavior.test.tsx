import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { NotificationProvider } from '@/contexts/NotificationProvider'
import { NotificationBell } from './NotificationBell'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'

function renderWithProviders(ui: React.ReactNode, { pollMs = 30_000 } = {}) {
  return render(
    <MemoryRouter>
      <NotificationProvider pollMs={pollMs}>{ui}</NotificationProvider>
    </MemoryRouter>
  )
}

describe('NotificationBell behavior', () => {
  it('marks all as read when dropdown opens (badge disappears)', async () => {
    // Ensure API returns two unread
    server.use(
      http.get('http://localhost:3000/api/notifications', () => {
        return HttpResponse.json({
          data: [
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
        })
      })
    )

    renderWithProviders(<NotificationBell />)

    const btn = await screen.findByRole('button', { name: /open notifications/i })
    expect(within(btn).getByText('2')).toBeInTheDocument()

    // Open dropdown → optimistic mark-all → badge removed
    const user = userEvent.setup()
    await user.click(btn)
    await waitFor(() => expect(btn).toHaveAttribute('aria-expanded', 'true'))

    await waitFor(() => {
      expect(within(btn).queryByText('2')).not.toBeInTheDocument()
    })
  })

  it('shows a toast when a new notification arrives via polling', async () => {
    const calls: number[] = []
    server.use(
      http.get('http://localhost:3000/api/notifications', () => {
        calls.push(1)
        // First call: nothing → no initial toast
        if (calls.length === 1) {
          return HttpResponse.json({ data: [] })
        }
        // Second call: one new unread
        return HttpResponse.json({
          data: [
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
        })
      })
    )

    // Reset toast mocks
    vi.clearAllMocks()

    renderWithProviders(<NotificationBell />, { pollMs: 50 })

    // Wait until the second poll triggers and toast is emitted
    await waitFor(() => {
      // Any variant is fine, but warning should be called based on level mapping
      // @ts-expect-error - Vitest mock type
      expect(toast.warning.mock.calls.length).toBeGreaterThan(0)
    })
  })
})
