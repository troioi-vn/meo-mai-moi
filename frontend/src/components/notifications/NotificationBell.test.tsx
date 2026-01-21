import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NotificationBell } from './NotificationBell'
import { MemoryRouter } from 'react-router-dom'
import { NotificationsProvider } from '@/contexts/NotificationProvider'
import { TestAuthProvider } from '@/contexts/TestAuthProvider'

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    render(
      <MemoryRouter>
        <TestAuthProvider
          mockValues={{
            user: {
              id: 1,
              name: 'Test User',
              email: 'test@example.com',
              email_verified_at: new Date().toISOString(),
            },
            isAuthenticated: true,
          }}
        >
          <NotificationsProvider>
            <NotificationBell />
          </NotificationsProvider>
        </TestAuthProvider>
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /open notifications/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/notifications')
    // Check for the presence of the SVG icon within the link
    expect(link.querySelector('svg')).toBeInTheDocument()
  })
})
