import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithRouter } from '@/testing'
import { NotificationBell } from './NotificationBell'

describe('NotificationBell', () => {
  it('renders the bell icon', () => {
    renderWithRouter(<NotificationBell />, {
      initialAuthState: {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          email_verified_at: new Date().toISOString(),
        },
        isAuthenticated: true,
      },
    })
    const link = screen.getByRole('link', { name: /open notifications/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/notifications')
    // Check for the presence of the SVG icon within the link
    expect(link.querySelector('svg')).toBeInTheDocument()
  })
})
